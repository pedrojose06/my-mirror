import { GoogleGenAI } from "@google/genai";
import {
  EvaluationResultSchema,
  StyleProfile,
  EvaluationResult,
  SuggestionItem,
} from "./schema";
import { SYSTEM_PROMPT, buildUserPromptText } from "./promptBuilder";

// Modelo da BUSCA de recomendações (grounding com Google Search).
// Usamos a família Gemini 3.x: grounding mais barato (US$14/1k + 5k/mês grátis).
const SEARCH_MODEL = process.env.GEMINI_SEARCH_MODEL || "gemini-3-flash-preview";

// Modelo do Gemini — pode ser sobrescrito por GEMINI_MODEL no .env.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Modelo e voz para a narração (TTS neural).
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
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
    descricao_look: "camiseta clara, calça jeans e tênis branco",
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

// Frequência do PCM exposta para o cabeçalho WAV de streaming.
export const TTS_SAMPLE_RATE = TTS_RATE;

// Gera a narração em STREAM: vai produzindo os pedaços de PCM conforme o
// Gemini sintetiza, para o app começar a tocar antes do áudio terminar.
export async function* speakStream(text: string): AsyncGenerator<Buffer> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Leia em português do Brasil, com um sorriso na voz, tom caloroso e gentil, em ritmo natural de conversa, como um consultor de estilo falando diretamente com a pessoa: ${text}`;

  const stream = await ai.models.generateContentStream({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: TTS_TEMPERATURE,
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
      },
    },
  });

  for await (const chunk of stream) {
    const data = chunk.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.data
    )?.inlineData?.data;
    if (data) yield Buffer.from(data, "base64");
  }
}

function mockSuggestions(): SuggestionItem[] {
  return [
    {
      nome: "Jaqueta jeans clara",
      descricao: "Uma jaqueta jeans clara dá um toque casual e combina com o look.",
      loja: "Exemplo Store",
      preco: "R$ 189",
      url: "https://example.com/jaqueta-jeans",
      patrocinado: false,
    },
    {
      nome: "Tênis branco clean",
      descricao: "Tênis branco minimalista para equilibrar o visual.",
      loja: "Exemplo Store",
      preco: "R$ 229",
      url: "https://example.com/tenis-branco-clean",
      patrocinado: false,
    },
  ];
}

// Busca roupas que combinam com o look usando Gemini + Google Search (grounding).
// Retorna apenas os itens ORGÂNICOS (os patrocinados são mesclados no endpoint).
export async function findSuggestions(
  descricaoLook: string,
  perfil: StyleProfile,
  limit = 4
): Promise<SuggestionItem[]> {
  if (MOCK_ENABLED) {
    await new Promise((r) => setTimeout(r, 600));
    return mockSuggestions().slice(0, limit);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Você é um(a) personal stylist. A pessoa está usando: ${descricaoLook}.
Perfil: ocasião ${perfil.ocasiao}, estilo ${perfil.estilo || "não informado"}, formalidade ${perfil.formalidade}, cores que gosta: ${perfil.cores_que_gosta.join(", ") || "não informado"}.
Use a busca do Google para encontrar ${limit} peças de roupa/acessórios REAIS à venda online que COMBINEM e complementem esse look (lojas do Brasil de preferência).
Responda APENAS com um array JSON, sem texto extra, no formato:
[{"nome":"...","descricao":"... (1 frase de por que combina)","loja":"...","preco":"R$ ... (se souber)","url":"https://link-real-do-produto"}]`;

  const response = await ai.models.generateContent({
    model: SEARCH_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = (response.text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extrai o primeiro array JSON do texto (grounding às vezes adiciona prosa)
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  let parsed: any[];
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }

  return parsed.slice(0, limit).map((p) => ({
    nome: String(p?.nome ?? "").slice(0, 120),
    descricao: String(p?.descricao ?? "").slice(0, 300),
    loja: String(p?.loja ?? "").slice(0, 80),
    preco: p?.preco ? String(p.preco).slice(0, 40) : undefined,
    url: typeof p?.url === "string" ? p.url : undefined,
    imagem: typeof p?.imagem === "string" ? p.imagem : undefined,
    patrocinado: false,
  }));
}
