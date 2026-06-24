import { StyleSheet, View, Text, TouchableOpacity, Image, Linking } from "react-native";
import { COLORS, FONT_SIZE, SPACING } from "../constants";
import { SuggestionItem } from "../constants/types";

// Card de uma recomendação de roupa (orgânica ou patrocinada). Mostra miniatura,
// nome, descrição, loja, preço e abre o produto no Google Shopping ao tocar.
export function SuggestionCard({ item }: { item: SuggestionItem }) {
  const handlePress = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      disabled={!item.url}
      accessibilityLabel={`${item.nome}${item.patrocinado ? ", patrocinado" : ""}. ${item.descricao}`}
      accessibilityRole={item.url ? "link" : "text"}
    >
      <View style={styles.row}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imageEmoji}>👕</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.nome} numberOfLines={2}>
              {item.nome}
            </Text>
            {item.patrocinado && (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>Patrocinado</Text>
              </View>
            )}
          </View>
          <Text style={styles.descricao} numberOfLines={3}>
            {item.descricao}
          </Text>
          <View style={styles.footer}>
            {item.loja ? <Text style={styles.loja}>{item.loja}</Text> : null}
            {item.preco ? <Text style={styles.preco}>{item.preco}</Text> : null}
          </View>
        </View>
      </View>
      {item.url && <Text style={styles.verProduto}>Ver no Google Shopping →</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageEmoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: SPACING.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  nome: {
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
  descricao: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  loja: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  preco: {
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
