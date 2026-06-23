// URL do backend — troca pelo URL da Vercel após o deploy
// Em desenvolvimento local, use o IP da sua máquina (não localhost — o device físico não enxerga)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:3000";

export const EVALUATE_ENDPOINT = `${API_BASE_URL}/api/evaluate`;
export const SUGGESTIONS_ENDPOINT = `${API_BASE_URL}/api/suggestions`;

// Design tokens
export const COLORS = {
  background: "#0a0a0a",
  surface: "#161616",
  surfaceElevated: "#1f1f1f",
  accent: "#c8f542",      // verde lima — o elemento de assinatura visual
  accentDim: "#8ab82e",
  textPrimary: "#f0f0f0",
  textSecondary: "#8a8a8a",
  textMuted: "#555555",
  success: "#4ade80",
  warning: "#facc15",
  error: "#f87171",
  border: "#2a2a2a",
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 36,
  display: 52,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Ocasiões disponíveis no perfil
export const OCASIOES = [
  { value: "casual", label: "Casual" },
  { value: "trabalho", label: "Trabalho" },
  { value: "evento", label: "Evento" },
  { value: "esporte", label: "Esporte" },
] as const;

export const FORMALIDADES = [
  { value: "baixa", label: "Descontraído" },
  { value: "média", label: "Semi-formal" },
  { value: "alta", label: "Formal" },
] as const;
