import Anthropic from "@anthropic-ai/sdk";
import { EvaluationResultSchema, StyleProfile, EvaluationResult } from "./schema";
import { SYSTEM_PROMPT, buildUserMessage } from "./promptBuilder";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Modo mock: devolve avaliação falsa sem chamar a API (para testar sem gastar créditos).
// Ativado por MOCK_AI=true ou quando não há ANTHROPIC_API_KEY configurada.
const MOCK_ENABLED = process.env.MOCK_AI === "true" || !process.env.ANTHROPIC_API_KEY;

function mockEvaluation(perfil: StyleProfile): EvaluationResult {
  return {
    nota: 8.5,
    resumo_voz: `Visual bem alinhado ao estilo ${perfil.estilo} para ${perfil.ocasiao}. As cores combinam e o caimento está ótimo. Considere acrescentar um acessório para finalizar.`,
    pontos_fortes: [
      "Combinação de cores harmoniosa",
      "Caimento adequado ao corpo",
    ],
    sugestoes: [
      "Adicionar um acessório para destacar o look",
      "Experimentar um calçado mais alinhado à ocasião",
    ],
    adequacao_ocasiao: "adequado",
  };
}

export async function evaluateLook(
  perfil: StyleProfile,
  imageBase64: string
): Promise<EvaluationResult> {
  if (MOCK_ENABLED) {
    // Simula latência de rede para o app se comportar como em produção
    await new Promise((r) => setTimeout(r, 800));
    return mockEvaluation(perfil);
  }

  const userMessage = buildUserMessage(perfil, imageBase64);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [userMessage],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA não contém bloco de texto");
  }

  // Remove possíveis backticks de markdown (safety net)
  const rawJson = textBlock.text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(`IA retornou JSON inválido: ${rawJson.slice(0, 200)}`);
  }

  const result = EvaluationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema inválido: ${result.error.message}`);
  }

  return result.data;
}
