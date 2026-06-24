// ---------------------------------------------------------------------------
// Rate limiting best-effort por IP (janela deslizante simples, em memória).
//
// LIMITAÇÃO: em serverless (Vercel) o estado é por instância e não compartilhado
// entre cold starts / regiões. Isto barra RAJADAS numa mesma instância quente,
// mas NÃO é um limite global garantido. Para limite forte em produção, trocar
// por um store distribuído (ex.: Upstash Redis) mantendo esta mesma interface.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpeza preguiçosa para o Map não crescer indefinidamente.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Consome 1 do orçamento da chave (ex.: IP) na janela informada.
 * @param key identificador (IP do cliente)
 * @param limit nº máximo de requisições por janela
 * @param windowMs tamanho da janela em ms
 */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (b.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }

  b.count += 1;
  return { allowed: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/** Extrai um identificador de cliente a partir dos headers da requisição. */
export function clientKey(headers: Record<string, unknown>): string {
  const xff = headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split(",")[0].trim();
  }
  const real = headers["x-real-ip"];
  if (typeof real === "string" && real.length > 0) return real;
  return "desconhecido";
}
