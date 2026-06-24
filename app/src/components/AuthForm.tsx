import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  type AuthResult,
} from "../services/auth";
import { COLORS, FONT_SIZE, SPACING } from "../constants";

type Mode = "login" | "signup";

const COPY: Record<Mode, { title: string; cta: string; switchText: string }> = {
  login: {
    title: "Entrar",
    cta: "ENTRAR",
    switchText: "Não tem conta?",
  },
  signup: {
    title: "Criar conta",
    cta: "CRIAR CONTA",
    switchText: "Já tem conta?",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = (res: AuthResult) => {
    if (res.ok) {
      // Sessão atualiza via onAuthStateChange; volta pra tela anterior.
      router.back();
    } else {
      setError(res.error ?? "Algo deu errado.");
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    const res =
      mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
    setLoading(false);
    finish(res);
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    finish(res);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={require("../../assets/brand/isologo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Luxai"
      />
      <Text style={styles.title}>{copy.title}</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        accessibilityLabel="E-mail"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        autoCapitalize="none"
        accessibilityLabel="Senha"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.cta}
        onPress={handleEmailSubmit}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaText}>{copy.cta}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogle}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Entrar com Google"
      >
        <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
        <Text style={styles.googleText}>Continuar com Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switch}
        onPress={() => router.replace(mode === "login" ? "/cadastro" : "/login")}
        accessibilityRole="button"
      >
        <Text style={styles.switchText}>
          {copy.switchText}{" "}
          <Text style={styles.switchLink}>
            {COPY[mode === "login" ? "signup" : "login"].title}
          </Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    justifyContent: "center",
    gap: SPACING.md,
  },
  logo: { width: 150, height: 60, alignSelf: "center", marginBottom: SPACING.sm },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    minHeight: 52,
  },
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
  },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    minHeight: 56,
  },
  googleText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  switch: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  switchText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  switchLink: { color: COLORS.accent, fontWeight: "700" },
});
