import type { VercelRequest } from "@vercel/node";

// Verifica se a requisição vem de um usuário LOGADO, validando o access token
// do Supabase NO SERVIDOR. Não dá para confiar num flag do cliente: senão
// qualquer um forja "estou logado" e drena as keys pagas (premium).
//
// Usa só valores públicos (SUPABASE_URL + SUPABASE_ANON_KEY). Sem eles
// configurados, trata como deslogado (free) por segurança — nunca libera
// premium sem conseguir verificar.
export async function isLoggedIn(req: VercelRequest): Promise<boolean> {
  const header =
    req.headers.authorization ?? (req.headers as Record<string, unknown>).Authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";
  if (!token) return false;

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return false;

  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    return r.ok; // 200 => token válido e não expirado
  } catch {
    return false; // rede/Supabase fora do ar => trata como deslogado
  }
}
