import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS } from "../src/constants";
import { setupPWA } from "../src/pwa";

export default function RootLayout() {
  const loadProfile = useAppStore((s) => s.loadProfile);
  const loadQuota = useAppStore((s) => s.loadQuota);
  const initAuth = useAppStore((s) => s.initAuth);

  useEffect(() => {
    loadProfile();
    loadQuota();
    initAuth();
    setupPWA(); // no-op fora do navegador
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="resultado"
          options={{
            title: "Avaliação",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="perfil"
          options={{ title: "Meu Estilo" }}
        />
        <Stack.Screen
          name="paywall"
          options={{ title: "Luxai Premium", presentation: "modal" }}
        />
        <Stack.Screen
          name="login"
          options={{ title: "Entrar", presentation: "modal" }}
        />
        <Stack.Screen
          name="cadastro"
          options={{ title: "Criar conta", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
