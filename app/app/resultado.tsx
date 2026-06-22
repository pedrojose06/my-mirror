import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as Speech from "expo-speech";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";
import { AdequacaoOcasiao } from "../src/constants/types";

const ADEQUACAO_COLOR: Record<AdequacaoOcasiao, string> = {
  "ótimo": COLORS.success,
  "adequado": COLORS.accent,
  "parcialmente adequado": COLORS.warning,
  "inadequado": COLORS.error,
};

export default function ResultadoScreen() {
  const lastResult = useAppStore((s) => s.lastResult);

  if (!lastResult) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Nenhuma avaliação ainda.</Text>
        <Text style={styles.emptyHint}>
          Volte à tela principal e toque em "Avaliar".
        </Text>
      </View>
    );
  }

  const handleRepeatVoice = () => {
    Speech.speak(lastResult.resumo_voz, { language: "pt-BR", rate: 0.9 });
  };

  const adequacaoColor =
    ADEQUACAO_COLOR[lastResult.adequacao_ocasiao] ?? COLORS.textSecondary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="Resultado da avaliação de look"
    >
      {/* Nota grande */}
      <View style={styles.notaSection} accessibilityLabel={`Nota ${lastResult.nota} de 10`}>
        <Text style={styles.notaValor}>{lastResult.nota.toFixed(1)}</Text>
        <Text style={styles.notaSuffix}>/10</Text>
      </View>

      {/* Adequação à ocasião */}
      <View style={[styles.adequacaoBadge, { borderColor: adequacaoColor }]}>
        <Text style={[styles.adequacaoText, { color: adequacaoColor }]}>
          {lastResult.adequacao_ocasiao.toUpperCase()}
        </Text>
      </View>

      {/* Resumo em voz */}
      <TouchableOpacity
        style={styles.resumoCard}
        onPress={handleRepeatVoice}
        accessibilityLabel={`Resumo: ${lastResult.resumo_voz}. Toque para ouvir novamente.`}
        accessibilityRole="button"
        accessibilityHint="Reproduz o feedback em voz"
      >
        <Text style={styles.sectionLabel}>🔊  RESUMO</Text>
        <Text style={styles.resumoText}>{lastResult.resumo_voz}</Text>
        <Text style={styles.ouvirNovamente}>Toque para ouvir novamente</Text>
      </TouchableOpacity>

      {/* Pontos fortes */}
      <View style={styles.section} accessibilityLabel="Pontos fortes">
        <Text style={styles.sectionLabel}>✅  PONTOS FORTES</Text>
        {lastResult.pontos_fortes.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listBullet}>—</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Sugestões */}
      <View style={styles.section} accessibilityLabel="Sugestões de ajuste">
        <Text style={styles.sectionLabel}>💡  SUGESTÕES</Text>
        {lastResult.sugestoes.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listBullet}>—</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.sm,
  },
  emptyHint: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: "center",
  },
  notaSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  notaValor: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.display,
    fontWeight: "800",
    lineHeight: FONT_SIZE.display,
  },
  notaSuffix: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: "400",
    marginBottom: 6,
    marginLeft: 4,
  },
  adequacaoBadge: {
    alignSelf: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginTop: -SPACING.md,
  },
  adequacaoText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  resumoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  resumoText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * 1.5,
  },
  ouvirNovamente: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItem: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  listBullet: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.md,
    marginTop: 2,
  },
  listText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * 1.5,
    flex: 1,
  },
});
