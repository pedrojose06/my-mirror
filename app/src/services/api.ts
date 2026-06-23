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
  const response = await fetch(SUGGESTIONS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descricao_look, perfil }),
  });

  if (!response.ok) return [];

  const data = await response.json().catch(() => ({}));
  return (data?.sugestoes as SuggestionItem[]) ?? [];
}
