import { z } from "zod";

// Perfil de estilo do usuário (enviado pelo app em cada chamada)
export const StyleProfileSchema = z.object({
  // Ocasião: presets (trabalho/casual/evento/esporte) ou texto livre ("Outra")
  ocasiao: z.string().min(1).max(50),
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
  // Descrição curta das peças/cores vistas — alimenta a busca de recomendações
  descricao_look: z.string().max(300).default(""),
});

// ----- Recomendações de roupas + ADS -----

// Um item sugerido (orgânico da busca OU patrocinado de um anunciante)
export const SuggestionItemSchema = z.object({
  nome: z.string(),
  descricao: z.string().default(""),
  loja: z.string().default(""),
  preco: z.string().optional(), // texto livre, ex: "R$ 199"
  url: z.string().optional(),
  imagem: z.string().optional(),
  patrocinado: z.boolean().default(false),
});

// Payload de entrada da rota /api/suggestions
export const SuggestionsRequestSchema = z.object({
  descricao_look: z.string().min(1).max(800),
  perfil: StyleProfileSchema,
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
export type SuggestionItem = z.infer<typeof SuggestionItemSchema>;
export type SuggestionsRequest = z.infer<typeof SuggestionsRequestSchema>;
