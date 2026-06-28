import { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LuxaiLoader } from "../src/components/LuxaiLoader";
import { OccasionWheel } from "../src/components/OccasionWheel";
import { useAppStore } from "../src/state/useAppStore";
import { evaluateLook, fetchSuggestions } from "../src/services/api";
import { speak } from "../src/services/voice";
import {
  CAPTURE_IMAGE_WIDTH,
  CAPTURE_IMAGE_COMPRESS,
  type CaptureMode,
} from "../src/constants/pose";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";

// ponytail: versão web do "espelho". Sem vision-camera/tflite/pose detection
// (não rodam no navegador) — getUserMedia para preview ao vivo + snapshot via
// <canvas>.toDataURL. O AVALIAR captura na hora; sem alinhamento automático.
// Câmera frontal fixa; flip omitido (web = espelho frontal). Add flip se pedirem.

type CamState = "loading" | "ready" | "denied" | "unsupported";

export default function MirrorScreenWeb() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<CamState>("loading");
  const [mode, setMode] = useState<CaptureMode>("idle");

  const profile = useAppStore((s) => s.profile);
  const lastResult = useAppStore((s) => s.lastResult);
  const freeLimitReached = useAppStore((s) => s.freeLimitReached);
  const setLastResult = useAppStore((s) => s.setLastResult);
  const setIsEvaluating = useAppStore((s) => s.setIsEvaluating);
  const setSuggestions = useAppStore((s) => s.setSuggestions);
  const setIsFetchingSuggestions = useAppStore((s) => s.setIsFetchingSuggestions);
  const registerEvaluation = useAppStore((s) => s.registerEvaluation);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("unsupported");
      return;
    }
    setCamState("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamState("ready");
    } catch {
      setCamState("denied");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // Snapshot do frame atual → base64 JPEG (mesma largura/compressão do nativo).
  const captureBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const w = CAPTURE_IMAGE_WIDTH;
    const h = Math.round(video.videoHeight * (w / video.videoWidth));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", CAPTURE_IMAGE_COMPRESS).split(",")[1] ?? null;
  }, []);

  // ponytail: orquestração espelhada de useLookEvaluation (nativo) — duplicada
  // de propósito para não tocar no hook/index nativo (vision-camera intocado).
  const handleAvaliar = useCallback(async () => {
    if (freeLimitReached) {
      router.push("/paywall");
      return;
    }
    setMode("evaluating");
    setIsEvaluating(true);
    setSuggestions([]);
    try {
      const base64 = captureBase64();
      if (!base64) throw new Error("Falha ao capturar imagem");

      const resultado = await evaluateLook(base64, profile);
      registerEvaluation();

      if (resultado.descricao_look) {
        setIsFetchingSuggestions(true);
        fetchSuggestions(resultado.descricao_look, profile)
          .then(setSuggestions)
          .finally(() => setIsFetchingSuggestions(false));
      }

      speak(resultado.resumo_voz, () => {
        setLastResult(resultado);
        setMode("idle");
      });
    } catch (err) {
      console.error("[capture web] erro:", err);
      speak("Não consegui avaliar o look agora. Tente novamente.", () => {
        setMode("idle");
      });
    } finally {
      setIsEvaluating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, freeLimitReached]);

  if (camState === "unsupported" || camState === "denied") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permissionText}>
          {camState === "unsupported"
            ? "Seu navegador não suporta acesso à câmera. Tente o Chrome ou Safari atualizado."
            : "O Luxai precisa da câmera para funcionar. Permita o acesso nas configurações do navegador."}
        </Text>
        {camState === "denied" && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={startCamera}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
          >
            <Text style={styles.permissionButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* preview ao vivo espelhado (DOM) atrás do overlay RN */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          background: COLORS.background,
        }}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <Image
          source={require("../assets/brand/isologo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="Luxai"
        />

        <View style={styles.topRow} pointerEvents="box-none">
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

        <View style={styles.captureArea} pointerEvents="box-none">
          {mode === "evaluating" ? (
            <View style={styles.evaluatingIndicator} accessibilityLiveRegion="polite">
              <LuxaiLoader size={96} />
              <Text style={styles.evaluatingText}>Analisando seu look…</Text>
            </View>
          ) : (
            <>
              <OccasionWheel />
              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleAvaliar}
                  disabled={camState !== "ready"}
                  accessibilityLabel="Avaliar look"
                  accessibilityRole="button"
                >
                  <Text style={styles.captureButtonText}>AVALIAR</Text>
                </TouchableOpacity>

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
  evaluatingIndicator: { alignItems: "center", gap: SPACING.sm },
  evaluatingText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
});
