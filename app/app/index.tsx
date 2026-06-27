import { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-worklets-core";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LuxaiLoader } from "../src/components/LuxaiLoader";
import { OccasionWheel } from "../src/components/OccasionWheel";
import { useAppStore } from "../src/state/useAppStore";
import { usePoseDetection } from "../src/hooks/usePoseDetection";
import { useLookEvaluation } from "../src/hooks/useLookEvaluation";
import {
  POSE_GUIDANCE,
  FULL_STREAK_TO_CAPTURE,
  type PoseStatus,
  type CaptureMode,
} from "../src/constants/pose";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";

export default function MirrorScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<"front" | "back">(
    "front"
  );
  const device = useCameraDevice(cameraPosition);

  // Modelo MoveNet (.tflite) + plugin de resize
  const movenet = useTensorflowModel(require("../assets/models/movenet.tflite"));
  const model = movenet.state === "loaded" ? movenet.model : undefined;
  const { resize } = useResizePlugin();

  if (!hasPermission) {
    return <PermissionGate onRequest={requestPermission} />;
  }
  if (device == null) {
    return <CameraLoading />;
  }

  // CameraScreen só monta com device válido — os hooks de frame processor
  // dependem de um device existente.
  return (
    <CameraScreen
      device={device}
      model={model}
      resize={resize}
      cameraPosition={cameraPosition}
      setCameraPosition={setCameraPosition}
    />
  );
}

function PermissionGate({ onRequest }: { onRequest: () => void }) {
  return (
    <View style={[styles.container, styles.centered]}>
      <Text style={styles.permissionText}>
        O Luxai precisa da câmera para funcionar.
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={onRequest}
        accessibilityLabel="Permitir acesso à câmera"
        accessibilityRole="button"
      >
        <Text style={styles.permissionButtonText}>Permitir câmera</Text>
      </TouchableOpacity>
    </View>
  );
}

function CameraLoading() {
  return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.permissionText}>Carregando câmera…</Text>
    </View>
  );
}

interface CameraScreenProps {
  device: NonNullable<ReturnType<typeof useCameraDevice>>;
  model: ReturnType<typeof useTensorflowModel>["model"];
  resize: ReturnType<typeof useResizePlugin>["resize"];
  cameraPosition: "front" | "back";
  setCameraPosition: (updater: (p: "front" | "back") => "front" | "back") => void;
}

function CameraScreen({
  device,
  model,
  resize,
  cameraPosition,
  setCameraPosition,
}: CameraScreenProps) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const lastResult = useAppStore((s) => s.lastResult);
  const freeLimitReached = useAppStore((s) => s.freeLimitReached);

  const cameraRef = useRef<Camera>(null);
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [poseStatus, setPoseStatus] = useState<PoseStatus>("none");

  // Flag compartilhada com o worklet: só processa frames durante o alinhamento
  const aligning = useSharedValue(false);
  useEffect(() => {
    aligning.value = mode === "aligning";
  }, [mode, aligning]);

  // Contadores para disparar a captura só após frames "full" estáveis
  const fullStreak = useRef(0);
  const capturingRef = useRef(false);

  const resetPose = useCallback(() => {
    setPoseStatus("none");
    fullStreak.current = 0;
    capturingRef.current = false;
  }, []);

  const captureAndEvaluate = useLookEvaluation({
    cameraRef,
    setMode,
    onSettled: resetPose,
  });

  // Recebe o status de pose do worklet e decide quando capturar
  const onStatus = useCallback(
    (status: PoseStatus) => {
      setPoseStatus(status);
      if (status === "full") {
        fullStreak.current += 1;
        if (
          fullStreak.current >= FULL_STREAK_TO_CAPTURE &&
          !capturingRef.current
        ) {
          capturingRef.current = true;
          captureAndEvaluate();
        }
      } else {
        fullStreak.current = 0;
      }
    },
    [captureAndEvaluate]
  );

  const frameProcessor = usePoseDetection({
    model,
    resize,
    aligning,
    cameraPosition,
    onStatus,
  });

  const startAligning = () => {
    // Bloqueia ao esgotar as avaliações gratuitas do aparelho → paywall.
    if (freeLimitReached) {
      router.push("/paywall");
      return;
    }
    resetPose();
    setMode("aligning");
  };

  const cancelAligning = () => {
    setMode("idle");
    setPoseStatus("none");
  };

  const flipCamera = () =>
    setCameraPosition((p) => (p === "front" ? "back" : "front"));

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && mode !== "idle"}
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* Fundo de marca enquanto câmera está inativa */}
      {mode === "idle" && (
        <View style={[StyleSheet.absoluteFill, styles.idleBackground]} />
      )}

      <View style={styles.overlay}>
        {/* Marca: ISOLOGO centralizado no topo */}
        <Image
          source={require("../assets/brand/isologo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="Luxai"
        />

        {/* Topo: nota anterior */}
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
        </View>

        {/* Centro: dica de enquadramento durante o alinhamento */}
        {mode === "aligning" && (
          <View style={styles.guidanceBox} accessibilityLiveRegion="polite">
            <Text style={styles.guidanceText}>{POSE_GUIDANCE[poseStatus]}</Text>
          </View>
        )}

        {/* Base: ícone trocar-câmera | botão principal | ícone config */}
        <View style={styles.captureArea}>
          {mode === "evaluating" ? (
            <View
              style={styles.evaluatingIndicator}
              accessibilityLiveRegion="polite"
            >
              <LuxaiLoader size={96} />
              <Text style={styles.evaluatingText}>Analisando seu look…</Text>
            </View>
          ) : (
            <>
              {mode === "idle" && <OccasionWheel />}
              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={styles.sideIcon}
                  onPress={flipCamera}
                  accessibilityLabel="Trocar câmera"
                  accessibilityRole="button"
                  hitSlop={12}
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={30}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {mode === "aligning" ? (
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

                <TouchableOpacity
                  style={styles.sideIcon}
                  onPress={() => router.push("/perfil")}
                  accessibilityLabel="Configurar meu perfil de estilo"
                  accessibilityRole="button"
                  hitSlop={12}
                >
                  <Ionicons name="settings-outline" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  overlay: { flex: 1, justifyContent: "space-between" },
  brandLogo: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    width: 150,
    height: 60,
    zIndex: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
  },
  permissionText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  permissionButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  notaBadge: {
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minWidth: 90,
  },
  notaLabel: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  notaValor: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: "800",
    lineHeight: 38,
  },
  notaVer: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  sideIcon: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
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
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xl,
  },
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
  captureButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cancelButton: {
    backgroundColor: "rgba(10,10,10,0.85)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    letterSpacing: 2,
  },
  idleBackground: { backgroundColor: COLORS.background },
  evaluatingIndicator: { alignItems: "center", gap: SPACING.sm },
  evaluatingText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
});
