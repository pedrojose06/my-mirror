import { EVALUATE_ENDPOINT, SUGGESTIONS_ENDPOINT } from "../constants";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";

export async function evaluateLook(
  imageBase64: string,
  perfil: StyleProfile
): Promise<EvaluationResult> {
  const response = await fetch(EVALUATE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagem_base64: imageBase64, perfil }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<EvaluationResult>;
}

export async function fetchSuggestions(
  descricao_look: string,
  perfil: StyleProfile
): Promise<SuggestionItem[]> {
  try {
    console.log("[suggestions] URL:", SUGGESTIONS_ENDPOINT, "descricao:", descricao_look);
    const response = await fetch(SUGGESTIONS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao_look, perfil }),
    });
    console.log("[suggestions] status:", response.status);

    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      console.log("[suggestions] erro body:", txt.slice(0, 300));
      return [];
    }

    const data = await response.json().catch(() => ({}));
    console.log("[suggestions] qtd:", data?.sugestoes?.length);
    return (data?.sugestoes as SuggestionItem[]) ?? [];
  } catch (err) {
    console.log("[suggestions] exception:", String(err));
    return [];
  }
}
