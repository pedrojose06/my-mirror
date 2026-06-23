import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  runAtTargetFps,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { Worklets, useSharedValue } from "react-native-worklets-core";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useAppStore } from "../src/state/useAppStore";
import { evaluateLook, fetchSuggestions } from "../src/services/api";
import { speak } from "../src/services/voice";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";

// Índices dos keypoints do MoveNet (ordem oficial)
const NOSE = 0;
const L_SHOULDER = 5;
const R_SHOULDER = 6;
const L_HIP = 11;
const R_HIP = 12;
const L_KNEE = 13;
const R_KNEE = 14;
const L_ANKLE = 15;
const R_ANKLE = 16;
const CONF = 0.3; // confiança mínima por keypoint

type PoseStatus = "none" | "top" | "bottom" | "full";

const GUIDANCE: Record<PoseStatus, string> = {
  none: "Posicione-se em frente à câmera",
  top: "Vejo só a parte de cima — afaste a câmera para mostrar o corpo todo",
  bottom: "Vejo só a parte de baixo — incline a câmera para cima",
  full: "Corpo inteiro detectado! Segure firme…",
};

type Mode = "idle" | "aligning" | "evaluating";

export default function MirrorScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<"front" | "back">("front");
  const device = useCameraDevice(cameraPosition);
  const cameraRef = useRef<Camera>(null);
  const router = useRouter();

  const {
    profile,
    lastResult,
    setLastResult,
    isEvaluating,
    setIsEvaluating,
    setSuggestions,
    setIsFetchingSuggestions,
  } = useAppStore();

  const [mode, setMode] = useState<Mode>("idle");
  const [poseStatus, setPoseStatus] = useState<PoseStatus>("none");

  // Carrega o modelo MoveNet (.tflite)
  const movenet = useTensorflowModel(require("../assets/models/movenet.tflite"));
  const model = movenet.state === "loaded" ? movenet.model : undefined;

  const { resize } = useResizePlugin();

  // Flag compartilhada com o worklet: só processa frames quando estiver alinhando
  const aligning = useSharedValue(false);
  useEffect(() => {
    aligning.value = mode === "aligning";
  }, [mode, aligning]);

  // Contador de frames "full" consecutivos para disparar a captura com estabilidade
  const fullStreak = useRef(0);
  const capturingRef = useRef(false);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permissionText}>
          O EspelhoIA precisa da câmera para funcionar.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityLabel="Permitir acesso à câmera"
          accessibilityRole="button"
        >
          <Text style={styles.permissionButtonText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.permissionText}>Carregando câmera…</Text>
      </View>
    );
  }

  return (
    <Screen
      device={device}
      cameraRef={cameraRef}
      model={model}
      resize={resize}
      aligning={aligning}
      cameraPosition={cameraPosition}
      setCameraPosition={setCameraPosition}
      mode={mode}
      setMode={setMode}
      poseStatus={poseStatus}
      setPoseStatus={setPoseStatus}
      fullStreak={fullStreak}
      capturingRef={capturingRef}
      profile={profile}
      lastResult={lastResult}
      setLastResult={setLastResult}
      isEvaluating={isEvaluating}
      setIsEvaluating={setIsEvaluating}
      setSuggestions={setSuggestions}
      setIsFetchingSuggestions={setIsFetchingSuggestions}
      router={router}
    />
  );
}

// Componente interno: só renderiza quando já temos device + permissão,
// para que os hooks de frame processor tenham um device válido.
function Screen({
  device,
  cameraRef,
  model,
  resize,
  aligning,
  cameraPosition,
  setCameraPosition,
  mode,
  setMode,
  poseStatus,
  setPoseStatus,
  fullStreak,
  capturingRef,
  profile,
  lastResult,
  setLastResult,
  isEvaluating,
  setIsEvaluating,
  setSuggestions,
  setIsFetchingSuggestions,
  router,
}: any) {
  const isFocused = useIsFocused();

  const captureAndEvaluate = useCallback(async () => {
    setMode("evaluating");
    setIsEvaluating(true);
    setSuggestions([]);
    try {
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });
      const uri = photo.path.startsWith("file://")
        ? photo.path
        : `file://${photo.path}`;

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error("Falha ao processar imagem");

      const resultado = await evaluateLook(manipulated.base64, profile);

      // Busca sugestões em paralelo com a voz (não bloqueia o fluxo)
      if (resultado.descricao_look) {
        setIsFetchingSuggestions(true);
        fetchSuggestions(resultado.descricao_look, profile)
          .then((items) => setSuggestions(items))
          .finally(() => setIsFetchingSuggestions(false));
      }

      // Mantém o "Analisando..." até a voz começar; aí revela a nota + fala juntos.
      speak(resultado.resumo_voz, () => {
        setLastResult(resultado);
        setMode("idle");
      });
    } catch (err) {
      console.error("[capture] erro:", err);
      speak("Não consegui avaliar o look agora. Tente novamente.", () => {
        setMode("idle");
      });
    } finally {
      setIsEvaluating(false);
      setPoseStatus("none");
      fullStreak.current = 0;
      capturingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Recebe o status de pose do worklet e decide quando capturar
  const onPoseStatus = useCallback(
    (status: PoseStatus) => {
      setPoseStatus(status);
      if (status === "full") {
        fullStreak.current += 1;
        if (fullStreak.current >= 2 && !capturingRef.current) {
          capturingRef.current = true;
          captureAndEvaluate();
        }
      } else {
        fullStreak.current = 0;
      }
    },
    [captureAndEvaluate]
  );

  const updateStatusJS = useMemo(
    () => Worklets.createRunOnJS(onPoseStatus),
    [onPoseStatus]
  );

  const lastStatus = useSharedValue<PoseStatus>("none");

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!aligning.value || model == null) return;

      runAtTargetFps(4, () => {
        "worklet";
        const resized = resize(frame, {
          scale: { width: 192, height: 192 },
          pixelFormat: "rgb",
          dataType: "uint8",
          rotation: cameraPosition === "front" ? "270deg" : "90deg",
        });

        const outputs = model.runSync([resized]);
        const kp = outputs[0] as unknown as Float32Array; // [y,x,score]*17

        const score = (i: number) => kp[i * 3 + 2];
        const yOf = (i: number) => kp[i * 3];

        const topVisible =
          score(NOSE) > CONF || score(L_SHOULDER) > CONF || score(R_SHOULDER) > CONF;
        // "Parte de baixo" = joelhos OU tornozelos visíveis (mais robusto que só tornozelo)
        const bottomVisible =
          score(L_KNEE) > CONF ||
          score(R_KNEE) > CONF ||
          score(L_ANKLE) > CONF ||
          score(R_ANKLE) > CONF;

        let status: PoseStatus = "none";
        if (topVisible && bottomVisible) status = "full";
        else if (topVisible) status = "top";
        else if (bottomVisible) status = "bottom";

        if (status !== lastStatus.value || status === "full") {
          lastStatus.value = status;
          updateStatusJS(status);
        }
      });
    },
    [model, aligning, updateStatusJS, lastStatus, cameraPosition, resize]
  );

  const startAligning = () => {
    fullStreak.current = 0;
    capturingRef.current = false;
    setPoseStatus("none");
    setMode("aligning");
  };

  const cancelAligning = () => {
    setMode("idle");
    setPoseStatus("none");
  };

  const flipCamera = () =>
    setCameraPosition((p: string) => (p === "front" ? "back" : "front"));

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        photo={true}
        frameProcessor={frameProcessor}
      />

      <View style={styles.overlay}>
        {/* Topo: nota anterior + trocar câmera */}
        <View style={styles.topRow}>
          {lastResult ? (
            <Pressable
              style={styles.notaBadge}
              onPress={() => router.push("/resultado")}
              accessibilityLabel={`Última nota: ${lastResult.nota}. Toque para ver detalhes`}
            >
              <Text style={styles.notaLabel}>NOTA</Text>
              <Text style={styles.notaValor}>{lastResult.nota.toFixed(1)}</Text>
              <Text style={styles.notaVer}>ver detalhes →</Text>
            </Pressable>
          ) : (
            <View />
          )}

          <View style={styles.topButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={flipCamera}
              accessibilityLabel="Trocar câmera"
              accessibilityRole="button"
            >
              <Text style={styles.iconText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/perfil")}
              accessibilityLabel="Configurar meu perfil de estilo"
              accessibilityRole="button"
            >
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Centro: dica de enquadramento durante o alinhamento */}
        {mode === "aligning" && (
          <View style={styles.guidanceBox} accessibilityLiveRegion="polite">
            <Text style={styles.guidanceText}>{GUIDANCE[poseStatus as PoseStatus]}</Text>
          </View>
        )}

        {/* Base: botão principal / loading */}
        <View style={styles.captureArea}>
          {mode === "evaluating" ? (
            <View style={styles.evaluatingIndicator} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.evaluatingText}>Analisando seu look…</Text>
            </View>
          ) : mode === "aligning" ? (
            <TouchableOpacity
              style={[styles.captureButton, styles.cancelButton]}
              onPress={cancelAligning}
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={startAligning}
              accessibilityLabel="Avaliar look"
              accessibilityHint="Aguarda você aparecer de corpo inteiro e captura automaticamente"
            >
              <Text style={styles.captureButtonText}>AVALIAR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: "center", alignItems: "center", padding: SPACING.xl, gap: SPACING.md },
  overlay: { flex: 1, justifyContent: "space-between" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
  },
  topButtons: { flexDirection: "row", gap: SPACING.sm },
  permissionText: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, textAlign: "center" },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  permissionButtonText: { color: COLORS.background, fontSize: FONT_SIZE.md, fontWeight: "700" },
  notaBadge: {
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minWidth: 90,
  },
  notaLabel: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: "700", letterSpacing: 1 },
  notaValor: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: "800", lineHeight: 38 },
  notaVer: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  iconButton: {
    width: 52,
    height: 52,
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 22 },
  guidanceBox: {
    alignSelf: "center",
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  guidanceText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    textAlign: "center",
    fontWeight: "600",
  },
  captureArea: { alignItems: "center", paddingBottom: 60 },
  captureButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 40,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    minWidth: 180,
    minHeight: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonText: { color: COLORS.background, fontSize: FONT_SIZE.md, fontWeight: "800", letterSpacing: 2 },
  cancelButton: { backgroundColor: "rgba(10,10,10,0.85)", borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: "700", letterSpacing: 2 },
  evaluatingIndicator: { alignItems: "center", gap: SPACING.sm },
  evaluatingText: { color: COLORS.accent, fontSize: FONT_SIZE.md, fontWeight: "600" },
});
