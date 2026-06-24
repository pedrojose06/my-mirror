// URL do backend — troca pelo URL da Vercel após o deploy
// Em desenvolvimento local, use o IP da sua máquina (não localhost — o device físico não enxerga)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:3000";

export const EVALUATE_ENDPOINT = `${API_BASE_URL}/api/evaluate`;
export const SUGGESTIONS_ENDPOINT = `${API_BASE_URL}/api/suggestions`;

// Nº de avaliações gratuitas por aparelho antes de pedir login/assinatura.
export const FREE_EVALUATION_LIMIT = 5;

// Design tokens — identidade visual Luxai
export const COLORS = {
  background: "#222222",       // charcoal mais profundo que a base da marca
  surface: "#2e2e2e",          // derivado do Charcoal Grey (#333333)
  surfaceElevated: "#3a3a3a",
  accent: "#8A2BE2",           // Royal Amethyst — cor de assinatura da marca
  accentDim: "#6f22b5",
  textPrimary: "#F8F8F8",      // Off-White dos highlights
  textSecondary: "#9a9a9a",
  textMuted: "#5a5a5a",
  success: "#4ade80",
  warning: "#facc15",
  error: "#f87171",
  border: "#3f3f3f",
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
  { value: "outra", label: "Outra" },
] as const;

// Valores de ocasião que são presets (qualquer outro = ocasião personalizada "Outra")
export const OCASIOES_PRESET = ["casual", "trabalho", "evento", "esporte"];

export const FORMALIDADES = [
  { value: "baixa", label: "Descontraído" },
  { value: "média", label: "Semi-formal" },
  { value: "alta", label: "Formal" },
] as const;
