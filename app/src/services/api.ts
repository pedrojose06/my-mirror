import { EVALUATE_ENDPOINT } from "../constants";
import { StyleProfile, EvaluationResult } from "../constants/types";

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
