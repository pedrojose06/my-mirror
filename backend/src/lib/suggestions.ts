import { StyleProfile, SuggestionItem } from "./schema";
import {
  SEARCH_FALLBACK_MODELS,
  MOCK_ENABLED,
  createGenAI,
} from "./geminiConfig";
import {
  buildSuggestionsSystemInstruction,
  buildSuggestionsPrompt,
} from "./promptBuilder";

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

// Detecta erros transitórios de sobrecarga do modelo (vale retry/fallback).
function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand")
  );
}

// Mapeia um item cru do modelo para SuggestionItem saneado e com URL própria.
function toSuggestionItem(p: any): SuggestionItem {
  const nome = String(p?.nome ?? "").slice(0, 120);
  const loja = String(p?.loja ?? "").slice(0, 80);
  // URL do Gemini grounding é instável (redirect que expira / 404). Em vez
  // disso, manda o usuário direto pro Google Shopping com o termo de busca.
  const query = encodeURIComponent(`${nome} ${loja}`.trim());
  return {
    nome,
    descricao: String(p?.descricao ?? "").slice(0, 300),
    loja,
    preco: p?.preco ? String(p.preco).slice(0, 40) : undefined,
    url: `https://www.google.com/search?tbm=shop&q=${query}`,
    imagem:
      typeof p?.imagem === "string" && p.imagem.startsWith("http")
        ? p.imagem
        : undefined,
    patrocinado: false,
  };
}

// Extrai o primeiro array JSON do texto (grounding às vezes adiciona prosa).
function parseJsonArray(text: string): any[] {
  const raw = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const ai = createGenAI();
  const systemInstruction = buildSuggestionsSystemInstruction();
  const prompt = buildSuggestionsPrompt(descricaoLook, perfil, limit);

  // Tenta cada modelo; em 503/sobrecarga, faz 1 retry rápido e troca de modelo.
  let response: any = null;
  let lastErr: unknown = null;
  outer: for (const model of SEARCH_FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { systemInstruction, tools: [{ googleSearch: {} }] },
        });
        break outer;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[findSuggestions] ${model} tentativa ${attempt + 1} falhou:`,
          msg.slice(0, 120)
        );
        if (!isOverloaded(err)) break; // erro não-transitório: próximo modelo
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  }

  if (!response) {
    throw lastErr ?? new Error("Falha ao gerar sugestões");
  }

  return parseJsonArray(response.text || "")
    .slice(0, limit)
    .map(toSuggestionItem);
}
