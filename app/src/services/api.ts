import { EVALUATE_ENDPOINT, SUGGESTIONS_ENDPOINT } from "../constants";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";
import { getDeviceId } from "./deviceQuota";
import { supabase } from "./supabase";

// Header de auth quando há sessão: o backend valida o token e, se válido,
// usa as keys premium (avaliação/voz). Sem sessão, vai vazio -> backend usa
// a key free-tier.
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// POST JSON genérico: serializa o corpo e lança um Error legível em caso de falha.
async function postJson<T>(
  url: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({} as any));
    throw new Error(data?.error ?? `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function evaluateLook(
  imageBase64: string,
  perfil: StyleProfile
): Promise<EvaluationResult> {
  // Envia o ID do aparelho para permitir enforcement de quota no servidor.
  const deviceId = await getDeviceId();
  return postJson<EvaluationResult>(
    EVALUATE_ENDPOINT,
    { imagem_base64: imageBase64, perfil },
    { "X-Device-Id": deviceId, ...(await authHeader()) }
  );
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
      { descricao_look, perfil },
      await authHeader()
    );
    return data.sugestoes ?? [];
  } catch (err) {
    console.warn("[suggestions] falha ao buscar:", String(err));
    return [];
  }
}
