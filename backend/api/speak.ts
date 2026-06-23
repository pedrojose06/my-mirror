import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { speakText } from "../src/lib/ai";

const SpeakRequestSchema = z.object({
  text: z.string().min(1).max(600),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const parsed = SpeakRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Payload inválido", detalhes: parsed.error.flatten() });
  }

  try {
    const audioBase64 = await speakText(parsed.data.text);
    // WAV em base64 — o app salva e toca.
    return res.status(200).json({ audioBase64, mimeType: "audio/wav" });
  } catch (err) {
    console.error("[speak] Erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(500).json({ error: "Falha ao gerar áudio", detalhes: message });
  }
}
