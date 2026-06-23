import { GoogleGenAI } from "@google/genai";
import { EvaluationResultSchema, StyleProfile, EvaluationResult } from "./schema";
import { SYSTEM_PROMPT, buildUserPromptText } from "./promptBuilder";

// Modelo do Gemini — pode ser sobrescrito por GEMINI_MODEL no .env.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash";

// Modo mock: devolve avaliação falsa sem chamar a API (para testar sem custo/sem key).
// Ativado por MOCK_AI=true ou quando não há GEMINI_API_KEY configurada.
const MOCK_ENABLED = process.env.MOCK_AI === "true" || !process.env.GEMINI_API_KEY;

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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  // Safety net: remove backticks de markdown caso apareçam
  const rawJson = rawText
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
