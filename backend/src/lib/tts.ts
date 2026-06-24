import {
  TTS_MODEL,
  TTS_VOICE,
  TTS_TEMPERATURE,
  TTS_RATE,
  createGenAI,
} from "./geminiConfig";

// Frequência do PCM exposta para o cabeçalho WAV de streaming.
export const TTS_SAMPLE_RATE = TTS_RATE;

// Prefixo de estilo (equivale às "Director's notes" do AI Studio):
// sorriso na voz, tom caloroso/gentil, ritmo natural de conversa.
function buildTtsPrompt(text: string): string {
  return `Leia em português do Brasil, com um sorriso na voz, tom caloroso e gentil, em ritmo natural de conversa, como um consultor de estilo falando diretamente com a pessoa: ${text}`;
}

// Config de fala compartilhada por speakText e speakStream.
const speechConfig = {
  temperature: TTS_TEMPERATURE,
  responseModalities: ["AUDIO"],
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
  },
};

// Extrai os bytes PCM (base64) de uma parte da resposta do Gemini TTS.
function extractPcmBase64(parts: any[] | undefined): string | undefined {
  return parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
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
  const ai = createGenAI();

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: buildTtsPrompt(text) }] }],
    config: speechConfig,
  });

  const b64 = extractPcmBase64(response.candidates?.[0]?.content?.parts);
  if (!b64) {
    throw new Error("Gemini TTS não retornou áudio");
  }

  const pcm = Buffer.from(b64, "base64");
  return pcmToWav(pcm, TTS_RATE).toString("base64");
}

// Gera a narração em STREAM: vai produzindo os pedaços de PCM conforme o
// Gemini sintetiza, para o app começar a tocar antes do áudio terminar.
export async function* speakStream(text: string): AsyncGenerator<Buffer> {
  const ai = createGenAI();

  const stream = await ai.models.generateContentStream({
    model: TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: buildTtsPrompt(text) }] }],
    config: speechConfig,
  });

  for await (const chunk of stream) {
    const data = extractPcmBase64(chunk.candidates?.[0]?.content?.parts);
    if (data) yield Buffer.from(data, "base64");
  }
}
