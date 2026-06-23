import { z } from "zod";

// Perfil de estilo do usuário (enviado pelo app em cada chamada)
export const StyleProfileSchema = z.object({
  ocasiao: z.enum(["trabalho", "casual", "evento", "esporte"]),
  estilo: z.string().max(100).default(""), // ex: "minimalista", "despojado"; pode ficar vazio
  cores_que_gosta: z.array(z.string()).max(10).default([]),
  cores_que_evita: z.array(z.string()).max(10).default([]),
  formalidade: z.enum(["baixa", "média", "alta"]),
  observacoes_extras: z.string().max(300).optional(),
});

// Payload de entrada da rota /api/evaluate
export const EvaluateRequestSchema = z.object({
  imagem_base64: z.string().min(100), // JPEG em base64
  perfil: StyleProfileSchema,
});

// Resposta estruturada da IA (o que o app exibe/fala)
export const EvaluationResultSchema = z.object({
  nota: z.number().min(0).max(10),
  resumo_voz: z.string().max(300), // texto otimizado para TTS — curto, sem bullet points
  pontos_fortes: z.array(z.string()).min(1).max(3),
  sugestoes: z.array(z.string()).min(1).max(3),
  adequacao_ocasiao: z.enum(["ótimo", "adequado", "parcialmente adequado", "inadequado"]),
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
