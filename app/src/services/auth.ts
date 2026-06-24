import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "./supabase";

// Garante que a sessão do navegador (OAuth) feche ao voltar pro app.
WebBrowser.maybeCompleteAuthSession();

// Deep link de retorno do OAuth (esquema "luxai" definido no app.json).
// Precisa estar nas Redirect URLs do Supabase (Auth → URL Configuration).
const redirectTo = makeRedirectUri({ scheme: "luxai" });

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// Traduz mensagens comuns do Supabase para PT-BR.
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem conta. Tente entrar.";
  if (m.includes("password") && m.includes("6")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("email") && m.includes("valid")) return "E-mail inválido.";
  return message;
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  return error ? { ok: false, error: friendlyError(error.message) } : { ok: true };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? { ok: false, error: friendlyError(error.message) } : { ok: true };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? "Não foi possível iniciar o login Google." };
  }

  // Abre o fluxo OAuth no navegador e espera o retorno via deep link.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    return { ok: false, error: "Login cancelado." };
  }

  // O Supabase devolve os tokens no fragmento (#) da URL de retorno.
  const fragment = result.url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    return { ok: false, error: "Retorno do Google inválido." };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  return sessionError
    ? { ok: false, error: sessionError.message }
    : { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
