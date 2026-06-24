import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/state/useAppStore";
import { signOut } from "../src/services/auth";
import { COLORS, FONT_SIZE, OCASIOES, FORMALIDADES, SPACING } from "../src/constants";

export default function PerfilScreen() {
  const router = useRouter();
  const { profile, setProfile, saveProfile } = useAppStore();
  const user = useAppStore((s) => s.user);

  const handleSave = async () => {
    await saveProfile();
    Alert.alert("Salvo!", "Seu perfil de estilo foi atualizado.");
  };

  const handleSignOut = async () => {
    await signOut();
    Alert.alert("Pronto", "Você saiu da sua conta.");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONTA</Text>
        {user ? (
          <>
            <Text style={styles.accountEmail}>{user.email}</Text>
            <TouchableOpacity
              style={styles.accountButton}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
            >
              <Text style={styles.accountButtonText}>Sair</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.accountRow}>
            <TouchableOpacity
              style={[styles.accountButton, styles.accountButtonPrimary]}
              onPress={() => router.push("/login")}
              accessibilityRole="button"
              accessibilityLabel="Entrar"
            >
              <Text style={styles.accountButtonTextPrimary}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountButton}
              onPress={() => router.push("/cadastro")}
              accessibilityRole="button"
              accessibilityLabel="Criar conta"
            >
              <Text style={styles.accountButtonText}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Ocasião */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>OCASIÃO DO DIA</Text>
        <View style={styles.optionsRow}>
          {OCASIOES.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[
                styles.optionChip,
                profile.ocasiao === o.value && styles.optionChipActive,
              ]}
              onPress={() => setProfile({ ocasiao: o.value })}
              accessibilityLabel={`Ocasião: ${o.label}`}
              accessibilityState={{ selected: profile.ocasiao === o.value }}
              accessibilityRole="radio"
            >
              <Text
                style={[
                  styles.optionChipText,
                  profile.ocasiao === o.value && styles.optionChipTextActive,
                ]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Formalidade */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NÍVEL DE FORMALIDADE</Text>
        <View style={styles.optionsRow}>
          {FORMALIDADES.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.optionChip,
                profile.formalidade === f.value && styles.optionChipActive,
              ]}
              onPress={() => setProfile({ formalidade: f.value })}
              accessibilityLabel={`Formalidade: ${f.label}`}
              accessibilityState={{ selected: profile.formalidade === f.value }}
              accessibilityRole="radio"
            >
              <Text
                style={[
                  styles.optionChipText,
                  profile.formalidade === f.value && styles.optionChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Estilo pessoal */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ESTILO PESSOAL</Text>
        <TextInput
          style={styles.textInput}
          value={profile.estilo}
          onChangeText={(val) => setProfile({ estilo: val })}
          placeholder="Ex: minimalista, despojado, clássico…"
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel="Descreva seu estilo pessoal"
          maxLength={100}
        />
      </View>

      {/* Cores que gosta */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CORES QUE GOSTA</Text>
        <TextInput
          style={styles.textInput}
          value={profile.cores_que_gosta.join(", ")}
          onChangeText={(val) =>
            setProfile({
              cores_que_gosta: val.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="Ex: azul, branco, cinza…"
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel="Cores que você gosta, separadas por vírgula"
        />
      </View>

      {/* Cores que evita */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CORES QUE EVITA</Text>
        <TextInput
          style={styles.textInput}
          value={profile.cores_que_evita.join(", ")}
          onChangeText={(val) =>
            setProfile({
              cores_que_evita: val.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="Ex: amarelo, laranja…"
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel="Cores que você evita, separadas por vírgula"
        />
      </View>

      {/* Observações extras */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>OBSERVAÇÕES EXTRAS (opcional)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMulti]}
          value={profile.observacoes_extras ?? ""}
          onChangeText={(val) => setProfile({ observacoes_extras: val })}
          placeholder="Ex: prefiro roupas folgadas, evito decotes…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={3}
          accessibilityLabel="Observações adicionais sobre seu estilo"
          maxLength={300}
        />
      </View>

      {/* Botão salvar */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        accessibilityLabel="Salvar perfil de estilo"
        accessibilityRole="button"
      >
        <Text style={styles.saveButtonText}>SALVAR PERFIL</Text>
      </TouchableOpacity>
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
    paddingBottom: SPACING.xxl,
  },
  section: {
    gap: SPACING.sm,
  },
  accountEmail: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  accountRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  accountButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  accountButtonPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  accountButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  accountButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 44,
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  optionChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  optionChipTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    minHeight: 52,
  },
  textInputMulti: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});
