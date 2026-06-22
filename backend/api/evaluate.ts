import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EvaluateRequestSchema } from "../src/lib/schema";
import { evaluateLook } from "../src/lib/claude";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Validar payload de entrada
  const parseResult = EvaluateRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Payload inválido",
      detalhes: parseResult.error.flatten(),
    });
  }

  const { imagem_base64, perfil } = parseResult.data;

  try {
    const resultado = await evaluateLook(perfil, imagem_base64);
    return res.status(200).json(resultado);
  } catch (err) {
    console.error("[evaluate] Erro:", err);

    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(500).json({ error: "Falha ao processar avaliação", detalhes: message });
  }
}
