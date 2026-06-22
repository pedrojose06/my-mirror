import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../src/state/useAppStore";
import { COLORS } from "../src/constants";

export default function RootLayout() {
  const loadProfile = useAppStore((s) => s.loadProfile);

  useEffect(() => {
    loadProfile();
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
      </Stack>
    </>
  );
}
