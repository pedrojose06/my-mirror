import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { speak } from "../src/services/voice";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS, FONT_SIZE, SPACING } from "../src/constants";
import { AdequacaoOcasiao, SuggestionItem } from "../src/constants/types";

const ADEQUACAO_COLOR: Record<AdequacaoOcasiao, string> = {
  "ótimo": COLORS.success,
  "adequado": COLORS.accent,
  "parcialmente adequado": COLORS.warning,
  "inadequado": COLORS.error,
};

export default function ResultadoScreen() {
  const lastResult = useAppStore((s) => s.lastResult);
  const suggestions = useAppStore((s) => s.suggestions);
  const isFetchingSuggestions = useAppStore((s) => s.isFetchingSuggestions);

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
    speak(lastResult.resumo_voz);
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

      {/* Sugestões de ajuste */}
      <View style={styles.section} accessibilityLabel="Sugestões de ajuste">
        <Text style={styles.sectionLabel}>💡  SUGESTÕES</Text>
        {lastResult.sugestoes.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listBullet}>—</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Recomendações de roupas */}
      {(isFetchingSuggestions || suggestions.length > 0) && (
        <View style={styles.section} accessibilityLabel="Recomendações de roupas">
          <Text style={styles.sectionLabel}>🛍  COMBINE COM O SEU LOOK</Text>
          {isFetchingSuggestions && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.loadingText}>Buscando sugestões…</Text>
            </View>
          ) : (
            suggestions.map((item, i) => (
              <SuggestionCard key={i} item={item} />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

function SuggestionCard({ item }: { item: SuggestionItem }) {
  const handlePress = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity
      style={styles.suggestionCard}
      onPress={handlePress}
      disabled={!item.url}
      accessibilityLabel={`${item.nome}${item.patrocinado ? ", patrocinado" : ""}. ${item.descricao}`}
      accessibilityRole={item.url ? "link" : "text"}
    >
      <View style={styles.suggestionRow}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.suggestionImage} />
        ) : (
          <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}>
            <Text style={styles.suggestionImageEmoji}>👕</Text>
          </View>
        )}
        <View style={styles.suggestionInfo}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionNome} numberOfLines={2}>{item.nome}</Text>
            {item.patrocinado && (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>Patrocinado</Text>
              </View>
            )}
          </View>
          <Text style={styles.suggestionDescricao} numberOfLines={3}>{item.descricao}</Text>
          <View style={styles.suggestionFooter}>
            {item.loja ? <Text style={styles.suggestionLoja}>{item.loja}</Text> : null}
            {item.preco ? <Text style={styles.suggestionPreco}>{item.preco}</Text> : null}
          </View>
        </View>
      </View>
      {item.url && <Text style={styles.verProduto}>Ver no Google Shopping →</Text>}
    </TouchableOpacity>
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  suggestionCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  suggestionImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  suggestionImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionImageEmoji: {
    fontSize: 32,
  },
  suggestionInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  suggestionNome: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    flex: 1,
  },
  sponsoredBadge: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sponsoredText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  suggestionDescricao: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  suggestionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  suggestionLoja: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  suggestionPreco: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },
  verProduto: {
    color: COLORS.accentDim,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
});
