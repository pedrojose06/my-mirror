import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes — autenticação não vai funcionar."
  );
}

// Client do Supabase para o app. A sessão é persistida no AsyncStorage e
// renovada automaticamente. detectSessionInUrl=false porque em React Native
// o retorno do OAuth chega via deep link, não pela URL do navegador.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
