import {
  EvaluationResultSchema,
  StyleProfile,
  EvaluationResult,
} from "./schema";
import { SYSTEM_PROMPT, buildUserPromptText } from "./promptBuilder";
import { MODEL, MOCK_ENABLED, createGenAI, resolveApiKey } from "./geminiConfig";

// Remove cercas de markdown (```json ... ```) que o modelo às vezes adiciona.
function stripJsonFences(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

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
    descricao_look: "camiseta clara, calça jeans e tênis branco",
  };
}

// Avalia o look a partir da imagem (base64) + perfil de estilo.
export async function evaluateLook(
  perfil: StyleProfile,
  imageBase64: string,
  loggedIn: boolean
): Promise<EvaluationResult> {
  if (MOCK_ENABLED) {
    // Simula latência de rede para o app se comportar como em produção
    await new Promise((r) => setTimeout(r, 800));
    return mockEvaluation(perfil);
  }

  // Logado: key premium de avaliação. Deslogado: key free-tier.
  const ai = createGenAI(resolveApiKey(loggedIn, "eval"));

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // Pede ao Gemini para responder JSON puro — evita backticks/markdown
      responseMimeType: "application/json",
      maxOutputTokens: 512,
    },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: buildUserPromptText(perfil) },
        ],
      },
    ],
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Resposta da IA não contém texto");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    throw new Error(`IA retornou JSON inválido: ${stripJsonFences(rawText).slice(0, 200)}`);
  }

  const result = EvaluationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema inválido: ${result.error.message}`);
  }

  return result.data;
}
