import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SuggestionsRequestSchema } from "../src/lib/schema";
import { findSuggestions } from "../src/lib/suggestions";
import { matchedSponsored } from "../src/lib/ads";
import { rateLimit, clientKey } from "../src/lib/rateLimit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Rate limit: busca usa grounding (custo). 15 req/min por IP (best-effort).
  const rl = rateLimit(`suggestions:${clientKey(req.headers)}`, 15, 60_000);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
  }

  const parsed = SuggestionsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Payload inválido", detalhes: parsed.error.flatten() });
  }

  const { descricao_look, perfil } = parsed.data;

  // Patrocinados (do registro de anunciantes) — não dependem do Gemini,
  // então sempre retornam, mesmo que a busca orgânica falhe.
  const sponsored = matchedSponsored(descricao_look, perfil, 2);

  // Orgânicos via Gemini grounding — isolado: se falhar (ex: 503 do modelo),
  // seguimos só com os patrocinados em vez de derrubar a resposta inteira.
  let organic: Awaited<ReturnType<typeof findSuggestions>> = [];
  try {
    organic = await findSuggestions(descricao_look, perfil, 4);
  } catch (err) {
    console.error("[suggestions] busca orgânica falhou (seguindo só com patrocinados):", err);
  }

  // Evita duplicar uma loja patrocinada que também apareça na busca orgânica.
  const sponsoredKeys = new Set(sponsored.map((s) => s.nome.toLowerCase()));
  const organicFiltered = organic.filter((o) => !sponsoredKeys.has(o.nome.toLowerCase()));

  const sugestoes = [...sponsored, ...organicFiltered].slice(0, 6);
  return res.status(200).json({ sugestoes });
}
