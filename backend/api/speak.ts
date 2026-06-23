import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { speakText, speakStream, TTS_SAMPLE_RATE } from "../src/lib/ai";

const SpeakRequestSchema = z.object({ text: z.string().min(1).max(600) });

// Cabeçalho WAV para streaming: tamanhos "infinitos" (0xFFFFFFFF) porque
// o comprimento total não é conhecido ao começar a transmitir.
function streamingWavHeader(sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(0xffffffff, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(numChannels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bitsPerSample, 34);
  h.write("data", 36);
  h.writeUInt32LE(0xffffffff, 40);
  return h;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  // GET -> transmite o áudio em stream (usado pelo player do app)
  if (req.method === "GET") {
    const text = typeof req.query.text === "string" ? req.query.text : "";
    if (!text || text.length > 600) {
      return res.status(400).json({ error: "Parâmetro 'text' inválido" });
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.write(streamingWavHeader(TTS_SAMPLE_RATE));
    try {
      for await (const pcm of speakStream(text)) {
        res.write(pcm);
      }
    } catch (err) {
      console.error("[speak GET] erro durante stream:", err);
    }
    return res.end();
  }

  // POST -> modo completo (JSON base64), mantido como fallback
  if (req.method === "POST") {
    const parsed = SpeakRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido" });
    }
    try {
      const audioBase64 = await speakText(parsed.data.text);
      return res.status(200).json({ audioBase64, mimeType: "audio/wav" });
    } catch (err) {
      console.error("[speak POST] Erro:", err);
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      return res.status(500).json({ error: "Falha ao gerar áudio", detalhes: message });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
