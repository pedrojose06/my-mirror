import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCamera } from "../src/hooks/useCamera";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";

export default function MirrorScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { cameraRef, capture, isEvaluating } = useCamera();
  const lastResult = useAppStore((s) => s.lastResult);
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
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

  return (
    <View style={styles.container}>
      {/* Preview da câmera — ocupa a tela toda (espelho) */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={"front" as CameraType}
        accessibilityLabel="Câmera frontal ativa"
      />

      {/* Overlay de controles */}
      <View style={styles.overlay}>
        {/* Nota do último resultado — topo */}
        {lastResult && (
          <Pressable
            style={styles.notaBadge}
            onPress={() => router.push("/resultado")}
            accessibilityLabel={`Última nota: ${lastResult.nota}. Toque para ver detalhes`}
            accessibilityRole="button"
          >
            <Text style={styles.notaLabel}>NOTA</Text>
            <Text style={styles.notaValor}>{lastResult.nota.toFixed(1)}</Text>
            <Text style={styles.notaVer}>ver detalhes →</Text>
          </Pressable>
        )}

        {/* Botão de perfil — canto superior direito */}
        <TouchableOpacity
          style={styles.perfilButton}
          onPress={() => router.push("/perfil")}
          accessibilityLabel="Configurar meu perfil de estilo"
          accessibilityRole="button"
        >
          <Text style={styles.perfilIcon}>⚙️</Text>
        </TouchableOpacity>

        {/* Botão principal de avaliação — centro-baixo */}
        <View style={styles.captureArea}>
          {isEvaluating ? (
            <View
              style={styles.evaluatingIndicator}
              accessibilityLabel="Analisando seu look, aguarde"
              accessibilityLiveRegion="polite"
            >
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.evaluatingText}>Analisando…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={capture}
              accessibilityLabel="Avaliar look agora"
              accessibilityRole="button"
              accessibilityHint="Captura uma foto e recebe feedback de estilo por voz e texto"
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  permissionText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    textAlign: "center",
    marginBottom: SPACING.lg,
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
    alignSelf: "flex-start",
    margin: SPACING.md,
    marginTop: 60, // SafeArea
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minWidth: 90,
    minHeight: 52,
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
  notaVer: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  perfilButton: {
    position: "absolute",
    top: 60,
    right: SPACING.md,
    width: 52,
    height: 52,
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  perfilIcon: {
    fontSize: 22,
  },
  captureArea: {
    alignItems: "center",
    paddingBottom: 60,
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
    color: COLORS.background,
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    letterSpacing: 2,
  },
  evaluatingIndicator: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  evaluatingText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
});
