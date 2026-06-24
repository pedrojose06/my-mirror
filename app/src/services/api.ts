import { EVALUATE_ENDPOINT, SUGGESTIONS_ENDPOINT } from "../constants";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";

// POST JSON genérico: serializa o corpo e lança um Error legível em caso de falha.
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({} as any));
    throw new Error(data?.error ?? `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function evaluateLook(
  imageBase64: string,
  perfil: StyleProfile
): Promise<EvaluationResult> {
  return postJson<EvaluationResult>(EVALUATE_ENDPOINT, {
    imagem_base64: imageBase64,
    perfil,
  });
}

// Busca recomendações. Nunca lança: falha de rede/servidor vira lista vazia
// (a seção de sugestões simplesmente não aparece, sem quebrar a avaliação).
export async function fetchSuggestions(
  descricao_look: string,
  perfil: StyleProfile
): Promise<SuggestionItem[]> {
  try {
    const data = await postJson<{ sugestoes?: SuggestionItem[] }>(
      SUGGESTIONS_ENDPOINT,
      { descricao_look, perfil }
    );
    return data.sugestoes ?? [];
  } catch (err) {
    console.warn("[suggestions] falha ao buscar:", String(err));
    return [];
  }
}
