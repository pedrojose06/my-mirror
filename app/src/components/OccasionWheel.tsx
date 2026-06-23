import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../state/useAppStore";
import { COLORS, FONT_SIZE, OCASIOES, OCASIOES_PRESET, SPACING } from "../constants";

const ITEM_WIDTH = 120;
const { width: SCREEN_W } = Dimensions.get("window");
const SIDE_PAD = (SCREEN_W - ITEM_WIDTH) / 2;

// Seletor de ocasião no estilo do seletor de modo da câmera (PHOTO | VIDEO …):
// deslizável, o item central fica em destaque. "Outra" abre um modal para
// digitar uma ocasião personalizada.
export function OccasionWheel() {
  const ocasiao = useAppStore((s) => s.profile.ocasiao);
  const setProfile = useAppStore((s) => s.setProfile);
  const scrollRef = useRef<ScrollView>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  // Índice selecionado a partir do valor atual:
  // preset → seu índice; valor livre (ou "outra") → índice de "Outra".
  const isPreset = OCASIOES_PRESET.includes(ocasiao);
  const selectedIndex = isPreset
    ? OCASIOES.findIndex((o) => o.value === ocasiao)
    : OCASIOES.findIndex((o) => o.value === "outra");

  // Mantém a rolagem alinhada ao valor atual quando ele muda de fora.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: selectedIndex * ITEM_WIDTH, animated: true });
  }, [selectedIndex]);

  const applyIndex = (index: number) => {
    const opt = OCASIOES[index];
    if (!opt) return;
    if (opt.value === "outra") {
      // Abre o modal pra digitar; preenche com o texto custom anterior, se houver.
      setCustomText(isPreset ? "" : ocasiao === "outra" ? "" : ocasiao);
      setModalOpen(true);
    } else {
      setProfile({ ocasiao: opt.value });
    }
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);
    applyIndex(index);
  };

  const confirmCustom = () => {
    const txt = customText.trim();
    setProfile({ ocasiao: txt || "outra" });
    setModalOpen(false);
  };

  const cancelCustom = () => {
    setModalOpen(false);
    // Se não havia ocasião personalizada válida, volta pro preset padrão.
    if (isPreset) {
      scrollRef.current?.scrollTo({ x: selectedIndex * ITEM_WIDTH, animated: true });
    }
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
        onMomentumScrollEnd={onMomentumEnd}
        contentOffset={{ x: selectedIndex * ITEM_WIDTH, y: 0 }}
      >
        {OCASIOES.map((o, i) => {
          const active = i === selectedIndex;
          // Rótulo de "Outra": mostra a ocasião digitada quando houver.
          const label =
            o.value === "outra" && !isPreset && ocasiao !== "outra"
              ? ocasiao
              : o.label;
          return (
            <TouchableOpacity
              key={o.value}
              style={styles.item}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * ITEM_WIDTH, animated: true });
                applyIndex(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ocasião: ${label}`}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.itemText, active && styles.itemTextActive]}
                numberOfLines={1}
              >
                {label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Indicador do item central */}
      <View style={styles.dot} pointerEvents="none" />

      {/* Modal pra digitar ocasião personalizada */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={cancelCustom}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Qual a ocasião?</Text>
            <TextInput
              style={styles.modalInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Ex: casamento, entrevista, festa…"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              maxLength={50}
              onSubmitEditing={confirmCustom}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtn} onPress={cancelCustom}>
                <Text style={styles.modalBtnTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={confirmCustom}
              >
                <Text style={styles.modalBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  itemTextActive: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
  },
  dot: {
    alignSelf: "center",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    minHeight: 52,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  modalBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.accent,
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  modalBtnTextSecondary: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
});
