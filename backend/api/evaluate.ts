import type { VercelRequest, VercelResponse } from "@vercel/node";
import { EvaluateRequestSchema } from "../src/lib/schema";
import { evaluateLook } from "../src/lib/evaluation";
import { rateLimit, clientKey } from "../src/lib/rateLimit";
import { isLoggedIn } from "../src/lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Rate limit: avaliação é cara (visão). 10 req/min por IP (best-effort).
  const rl = rateLimit(`evaluate:${clientKey(req.headers)}`, 10, 60_000);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
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

  // Logado -> key premium de avaliação. Deslogado -> key free-tier.
  const loggedIn = await isLoggedIn(req);

  try {
    const resultado = await evaluateLook(perfil, imagem_base64, loggedIn);
    return res.status(200).json(resultado);
  } catch (err) {
    console.error("[evaluate] Erro:", err);

    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(500).json({ error: "Falha ao processar avaliação", detalhes: message });
  }
}
