// Tipos e mensagens da detecção de pose (MoveNet) usados na tela da câmera.

// Estado do enquadramento do corpo detectado pelo MoveNet.
export type PoseStatus = "none" | "top" | "bottom" | "full";

// Estado da tela de captura.
export type CaptureMode = "idle" | "aligning" | "evaluating";

// Mensagens de orientação exibidas durante o alinhamento.
export const POSE_GUIDANCE: Record<PoseStatus, string> = {
  none: "Posicione-se em frente à câmera",
  top: "Vejo só a parte de cima — afaste a câmera para mostrar o corpo todo",
  bottom: "Vejo só a parte de baixo — incline a câmera para cima",
  full: "Corpo inteiro detectado! Segure firme…",
};

// Nº de frames "full" consecutivos para disparar a captura (estabilidade).
export const FULL_STREAK_TO_CAPTURE = 2;

// Parâmetros da foto enviada para avaliação.
export const CAPTURE_IMAGE_WIDTH = 768;
export const CAPTURE_IMAGE_COMPRESS = 0.7;
