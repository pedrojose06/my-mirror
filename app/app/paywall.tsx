import { StyleSheet, View, Text, TouchableOpacity, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS, FONT_SIZE, SPACING, FREE_EVALUATION_LIMIT } from "../src/constants";

const BENEFITS = [
  "Avaliações de look ilimitadas",
  "Recomendações de roupas personalizadas",
  "Voz neural e feedback detalhado",
  "Sem anúncios",
];

export default function PaywallScreen() {
  const router = useRouter();
  const evaluationsUsed = useAppStore((s) => s.evaluationsUsed);

  // CTA real (login + assinatura) ainda não implementado.
  const handleSubscribe = () => {
    Alert.alert(
      "Em breve",
      "As assinaturas Luxai Premium chegam já já. Obrigado por usar o app!"
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/brand/isologo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Luxai"
      />

      <Text style={styles.title}>Você usou suas {FREE_EVALUATION_LIMIT} avaliações grátis</Text>
      <Text style={styles.subtitle}>
        Foram {evaluationsUsed} avaliações neste aparelho. Assine o Luxai Premium
        para continuar avaliando seus looks sem limites.
      </Text>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={handleSubscribe}
        accessibilityRole="button"
        accessibilityLabel="Entrar ou assinar o Luxai Premium"
      >
        <Text style={styles.ctaText}>ENTRAR / ASSINAR</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dismiss}
        onPress={() => router.back()}
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>Agora não</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    justifyContent: "center",
    gap: SPACING.lg,
  },
  logo: {
    width: 160,
    height: 64,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: "center",
    lineHeight: FONT_SIZE.md * 1.5,
  },
  benefits: {
    gap: SPACING.sm,
    marginVertical: SPACING.md,
    alignSelf: "center",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  benefitCheck: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.lg,
    fontWeight: "800",
  },
  benefitText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  dismiss: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },
});
