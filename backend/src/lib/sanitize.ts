// ---------------------------------------------------------------------------
// Sanitizacao de texto fornecido pelo usuario antes de entrar em prompts da IA.
//
// Principio (defesa em profundidade): NENHUM texto livre do cliente vai cru pro
// prompt. Tudo passa por aqui - normaliza, remove caracteres usados pra forjar
// estrutura de prompt e neutraliza frases classicas de prompt injection.
//
// Nao substitui a delimitacao + systemInstruction (que tratam o conteudo como
// dado), mas e a primeira barreira: mesmo que algo escape, ja chega defanged.
// ---------------------------------------------------------------------------

// Frases tipicas de prompt injection / role hijacking. Casamento case-insensitive.
// A ideia nao e "bloquear" (lista nunca e completa) e sim neutralizar os padroes
// mais usados, reduzindo a eficacia de um payload.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|the\s+above)/gi,
  /disregard\s+(?:all\s+|any\s+)?(?:previous|prior|above|instructions?)/gi,
  /ignor[ae]\s+(?:as\s+|todas\s+as\s+)?instru\S*/gi,
  /desconsider[ae]\s+(?:as\s+)?instru\S*/gi,
  /esque[çc]a\s+(?:as\s+|tudo)/gi,
  /voc[eê]\s+(?:agora\s+)?[eéó]\s+\S+/gi,
  /you\s+are\s+(?:now\s+)?\S+/gi,
  /pretend\s+(?:to\s+be|you)/gi,
  /\b(?:system|assistant|user|developer)\s*[:：]/gi,
  /\b(?:sistema|assistente|usu[aá]rio|desenvolvedor)\s*[:：]/gi,
  /<\s*\/?\s*(?:system|assistant|user|instructions?)\s*>/gi,
  /\[\s*\/?\s*(?:system|assistant|user|inst)\b/gi,
  /(?:new|nova)\s+(?:instructions?|instru\S*|regras?|rules?)/gi,
  /act\s+as\s+(?:a\s+|an\s+)?/gi,
  /aja\s+como\b/gi,
  /jailbreak/gi,
  /\bDAN\b/g,
];

// Caracteres usados para forjar estrutura/delimitadores de prompt.
// Removidos por completo - texto de estilo legitimo nao precisa deles.
const STRUCTURE_CHARS = /[<>{}`|\\]/g;

// Remove caracteres de controle (C0/C1) e invisiveis (zero-width, joiners,
// marcas de direcao, BOM) por comparacao numerica de code point - sem chars
// literais no fonte. Cada um vira espaco para nao colar palavras.
function stripControlAndInvisible(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const isControl = c < 0x20 || (c >= 0x7f && c <= 0x9f);
    const isInvisible =
      (c >= 0x200b && c <= 0x200f) || // zero-width + LRM/RLM
      (c >= 0x202a && c <= 0x202e) || // marcas de direcao
      (c >= 0x2060 && c <= 0x2064) || // word joiner / invisible ops
      c === 0xfeff; // BOM / zero-width no-break space
    out += isControl || isInvisible ? " " : ch;
  }
  return out;
}

/**
 * Sanitiza um texto livre vindo do cliente.
 * @param input valor cru (qualquer tipo - coagido a string)
 * @param maxLen tamanho maximo final (corte rigido)
 */
export function sanitizeUserText(input: unknown, maxLen = 300): string {
  if (input == null) return "";
  let s = String(input);

  // 1) Normaliza Unicode (evita composicoes estranhas/homoglyphs)
  s = s.normalize("NFC");

  // 2) Remove caracteres de controle e invisiveis
  s = stripControlAndInvisible(s);

  // 3) Remove caracteres de estrutura de prompt
  s = s.replace(STRUCTURE_CHARS, " ");

  // 4) Neutraliza padroes de injecao conhecidos
  for (const re of INJECTION_PATTERNS) {
    s = s.replace(re, " [removido] ");
  }

  // 5) Colapsa espacos e corta no limite
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();

  return s;
}

/** Sanitiza uma lista de textos (ex.: cores), limitando itens e tamanho de cada. */
export function sanitizeList(
  input: unknown,
  maxItems = 10,
  maxLenEach = 40
): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, maxItems)
    .map((item) => sanitizeUserText(item, maxLenEach))
    .filter((s) => s.length > 0);
}
