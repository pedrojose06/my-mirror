import { StyleProfile, SuggestionItem } from "./schema";

// ---------------------------------------------------------------------------
// Camada de ADS (anunciantes patrocinados)
//
// Estrutura pensada para evoluir: hoje é um registro em memória; amanhã pode
// virar uma tabela no banco sem mudar a interface. Cada anunciante tem uma
// "prioridade" (lance/bid) — quanto maior, mais acima aparece entre os
// patrocinados que casarem com o look.
// ---------------------------------------------------------------------------

export interface AdProduct {
  nome: string;
  descricao: string;
  url: string;
  loja: string;
  preco?: string;
  imagem?: string;
  // Palavras-chave que casam com o look/perfil (minúsculas, sem acento de preferência)
  tags: string[];
}

export interface Advertiser {
  id: string;
  loja: string;
  ativo: boolean;
  prioridade: number; // lance: maior = aparece antes
  produtos: AdProduct[];
}

// Registro de anunciantes. Exemplo inicial — trocar/expandir conforme contratos.
// (No futuro: carregar de um banco/painel de anunciantes.)
export const ADVERTISERS: Advertiser[] = [
  {
    id: "loja-exemplo",
    loja: "Loja Exemplo",
    ativo: true,
    prioridade: 10,
    produtos: [
      {
        nome: "Tênis branco minimalista",
        descricao: "Tênis casual de couro branco, combina com jeans e looks despojados.",
        url: "https://example.com/tenis-branco",
        loja: "Loja Exemplo",
        preco: "R$ 249",
        tags: ["casual", "tenis", "branco", "jeans", "minimalista", "esporte"],
      },
      {
        nome: "Camisa social azul-marinho",
        descricao: "Camisa de algodão azul-marinho, ideal para ocasiões formais.",
        url: "https://example.com/camisa-azul",
        loja: "Loja Exemplo",
        preco: "R$ 199",
        tags: ["trabalho", "evento", "camisa", "azul", "formal", "alta"],
      },
    ],
  },
];

// Normaliza texto para casamento simples por palavra-chave.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos
}

// Monta o conjunto de termos do look + perfil para casar com as tags.
function lookTerms(descricaoLook: string, perfil: StyleProfile): string[] {
  const blob = [
    descricaoLook,
    perfil.ocasiao,
    perfil.estilo,
    perfil.formalidade,
    ...perfil.cores_que_gosta,
  ].join(" ");
  return normalize(blob)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

// Retorna os produtos patrocinados que casam com o look, ordenados por
// (prioridade do anunciante, número de tags que bateram).
export function matchedSponsored(
  descricaoLook: string,
  perfil: StyleProfile,
  limit = 2
): SuggestionItem[] {
  const terms = new Set(lookTerms(descricaoLook, perfil));

  const scored: { score: number; prioridade: number; item: SuggestionItem }[] = [];

  for (const adv of ADVERTISERS) {
    if (!adv.ativo) continue;
    for (const p of adv.produtos) {
      const score = p.tags.reduce(
        (acc, tag) => acc + (terms.has(normalize(tag)) ? 1 : 0),
        0
      );
      if (score <= 0) continue;
      scored.push({
        score,
        prioridade: adv.prioridade,
        item: {
          nome: p.nome,
          descricao: p.descricao,
          loja: p.loja,
          preco: p.preco,
          url: p.url,
          imagem: p.imagem,
          patrocinado: true,
        },
      });
    }
  }

  scored.sort((a, b) => b.prioridade - a.prioridade || b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
