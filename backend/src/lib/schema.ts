import { z } from "zod";
import { sanitizeUserText, sanitizeList } from "./sanitize";

// Helper: string de texto livre já SANITIZADA na borda de validação.
// Todo handler que usa o schema recebe o valor limpo (defesa em profundidade).
const safeText = (max: number) =>
  z
    .string()
    .max(max * 2) // limite bruto generoso antes de sanitizar/cortar
    .transform((v) => sanitizeUserText(v, max));

const safeColorList = z
  .array(z.string().max(80))
  .max(20)
  .default([])
  .transform((arr) => sanitizeList(arr, 10, 40));

// Perfil de estilo do usuário (enviado pelo app em cada chamada)
export const StyleProfileSchema = z.object({
  // Ocasião: presets (trabalho/casual/evento/esporte) ou texto livre ("Outra")
  ocasiao: safeText(50).pipe(z.string().min(1, "ocasião vazia após sanitização")),
  estilo: safeText(100).optional().default(""),
  cores_que_gosta: safeColorList,
  cores_que_evita: safeColorList,
  formalidade: z.enum(["baixa", "média", "alta"]),
  observacoes_extras: safeText(300).optional(),
});

// Payload de entrada da rota /api/evaluate
export const EvaluateRequestSchema = z.object({
  // JPEG em base64: só aceita caracteres base64 e limita tamanho (~8MB de chars
  // ≈ imagem de ~6MB) para evitar payloads gigantes que estourem custo/memória.
  imagem_base64: z
    .string()
    .min(100)
    .max(8_000_000)
    .regex(/^[A-Za-z0-9+/=\s]+$/, "imagem_base64 inválida"),
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
// descricao_look vem do cliente (que recebeu da avaliação) — tratamos como
// NÃO confiável e sanitizamos como qualquer outro texto livre.
export const SuggestionsRequestSchema = z.object({
  descricao_look: safeText(300).pipe(
    z.string().min(1, "descrição vazia após sanitização")
  ),
  perfil: StyleProfileSchema,
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
export type SuggestionItem = z.infer<typeof SuggestionItemSchema>;
export type SuggestionsRequest = z.infer<typeof SuggestionsRequestSchema>;
