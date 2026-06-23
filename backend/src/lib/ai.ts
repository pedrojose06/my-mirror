import { GoogleGenAI } from "@google/genai";
import { EvaluationResultSchema, StyleProfile, EvaluationResult } from "./schema";
import { SYSTEM_PROMPT, buildUserPromptText } from "./promptBuilder";

// Modelo do Gemini — pode ser sobrescrito por GEMINI_MODEL no .env.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Modelo e voz para a narração (TTS neural).
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Vindemiatrix"; // voz gentil/natural
const TTS_TEMPERATURE = Number(process.env.GEMINI_TTS_TEMPERATURE ?? 1.2);
const TTS_RATE = 24000; // Gemini TTS devolve PCM 16-bit mono a 24kHz

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

// Constrói um cabeçalho WAV (PCM 16-bit) em torno dos bytes PCM crus.
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // tamanho do subchunk fmt
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Gera a narração natural do texto via Gemini TTS. Retorna um WAV em base64.
export async function speakText(text: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Prefixo de estilo (equivale às "Director's notes" do AI Studio):
  // sorriso na voz, tom caloroso/gentil, ritmo natural de conversa.
  const prompt = `Leia em português do Brasil, com um sorriso na voz, tom caloroso e gentil, em ritmo natural de conversa, como um consultor de estilo falando diretamente com a pessoa: ${text}`;

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: TTS_TEMPERATURE,
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TTS_VOICE },
        },
      },
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.data
  );
  const b64 = part?.inlineData?.data;
  if (!b64) {
    throw new Error("Gemini TTS não retornou áudio");
  }

  const pcm = Buffer.from(b64, "base64");
  const wav = pcmToWav(pcm, TTS_RATE);
  return wav.toString("base64");
}
