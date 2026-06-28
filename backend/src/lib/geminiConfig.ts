import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Configuração central do Gemini: nomes de modelo, voz e flags de ambiente.
// Mantido num só lugar para evitar strings mágicas espalhadas pelo código.
// ---------------------------------------------------------------------------

// Modelo da avaliação de look (visão + JSON).
export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Modelo da BUSCA de recomendações (grounding com Google Search).
// gemini-2.5-flash é estável e suporta grounding (~$35/1k chamadas).
// Para tentar a versão mais barata, defina GEMINI_SEARCH_MODEL=gemini-3-flash-preview
// no .env (Gemini 3.x preview: $14/1k + 5k/mês grátis, mas pode dar 503).
export const SEARCH_MODEL =
  process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";

// Fallbacks de busca acionados quando o modelo principal dá 503/sobrecarga.
export const SEARCH_FALLBACK_MODELS = [
  SEARCH_MODEL,
  "gemini-flash-latest",
  "gemini-2.0-flash",
].filter((m, i, arr) => arr.indexOf(m) === i);

// Narração (TTS neural).
export const TTS_MODEL =
  process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
export const TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Vindemiatrix";
export const TTS_TEMPERATURE = Number(process.env.GEMINI_TTS_TEMPERATURE ?? 1.2);
export const TTS_RATE = 24000; // Gemini TTS devolve PCM 16-bit mono a 24kHz

// Modo mock: devolve respostas falsas sem chamar a API (testar sem custo/sem key).
// Ativado por MOCK_AI=true ou quando não há nenhuma key configurada.
export const MOCK_ENABLED =
  process.env.MOCK_AI === "true" ||
  (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY_FREE);

export type ApiKeyPurpose = "eval" | "tts";

/**
 * Seleciona a API key do Gemini conforme o estado de login e a finalidade.
 *
 * - LOGADO (premium): avaliação/sugestões usam GEMINI_API_KEY; voz usa
 *   GEMINI_TTS_API_KEY. (futuramente: feature paga)
 * - DESLOGADO (free): tudo usa GEMINI_API_KEY_FREE.
 *
 * Os fallbacks para GEMINI_API_KEY mantêm o setup de chave única funcionando
 * (se TTS/FREE não estiverem definidas, cai na key principal).
 */
export function resolveApiKey(loggedIn: boolean, purpose: ApiKeyPurpose): string {
  let key: string | undefined;
  if (!loggedIn) {
    key = process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY;
  } else if (purpose === "tts") {
    key = process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_API_KEY;
  } else {
    key = process.env.GEMINI_API_KEY;
  }
  if (!key) {
    throw new Error("Nenhuma GEMINI_API_KEY configurada para esta requisição");
  }
  return key;
}

/**
 * Cria um cliente do Gemini com a key informada (use resolveApiKey para obtê-la).
 */
export function createGenAI(apiKey: string): GoogleGenAI {
  if (!apiKey) throw new Error("API key do Gemini ausente");
  return new GoogleGenAI({ apiKey });
}
