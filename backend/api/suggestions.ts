import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SuggestionsRequestSchema } from "../src/lib/schema";
import { findSuggestions } from "../src/lib/ai";
import { matchedSponsored } from "../src/lib/ads";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const parsed = SuggestionsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Payload inválido", detalhes: parsed.error.flatten() });
  }

  const { descricao_look, perfil } = parsed.data;

  try {
    // Patrocinados (do registro de anunciantes) primeiro; orgânicos preenchem o resto.
    const sponsored = matchedSponsored(descricao_look, perfil, 2);
    const organic = await findSuggestions(descricao_look, perfil, 4);

    // Evita duplicar uma loja patrocinada que também apareça na busca orgânica.
    const sponsoredKeys = new Set(sponsored.map((s) => s.nome.toLowerCase()));
    const organicFiltered = organic.filter((o) => !sponsoredKeys.has(o.nome.toLowerCase()));

    const sugestoes = [...sponsored, ...organicFiltered].slice(0, 6);
    return res.status(200).json({ sugestoes });
  } catch (err) {
    console.error("[suggestions] Erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(500).json({ error: "Falha ao buscar recomendações", detalhes: message });
  }
}
