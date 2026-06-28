import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";
import { getEvaluationsUsed, consumeEvaluation } from "../services/deviceQuota";
import { supabase } from "../services/supabase";
import { FREE_EVALUATION_LIMIT } from "../constants";

const PROFILE_KEY = "@espelhoia:profile";

// Premium ignora a trava de avaliações gratuitas.
function limitReached(used: number, isPremium: boolean): boolean {
  return !isPremium && used >= FREE_EVALUATION_LIMIT;
}

// Lê a flag is_premium do perfil do usuário e re-avalia a trava.
// Deslogado / sem linha em profiles => não-premium (default false).
async function syncPremium(
  userId: string | undefined,
  set: (partial: Partial<AppState>) => void,
  get: () => AppState
): Promise<void> {
  let isPremium = false;
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle();
    isPremium = data?.is_premium === true;
  }
  set({ isPremium, freeLimitReached: limitReached(get().evaluationsUsed, isPremium) });
}

const DEFAULT_PROFILE: StyleProfile = {
  ocasiao: "casual",
  estilo: "minimalista",
  cores_que_gosta: [],
  cores_que_evita: [],
  formalidade: "baixa",
};

interface AppState {
  profile: StyleProfile;
  lastResult: EvaluationResult | null;
  isEvaluating: boolean;
  suggestions: SuggestionItem[];
  isFetchingSuggestions: boolean;

  // Quota de avaliações gratuitas por aparelho
  evaluationsUsed: number;
  freeLimitReached: boolean;
  isPremium: boolean;

  // Autenticação (Supabase)
  session: Session | null;
  user: User | null;
  authReady: boolean;

  setProfile: (profile: Partial<StyleProfile>) => void;
  saveProfile: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setLastResult: (result: EvaluationResult | null) => void;
  setIsEvaluating: (val: boolean) => void;
  setSuggestions: (items: SuggestionItem[]) => void;
  setIsFetchingSuggestions: (val: boolean) => void;
  loadQuota: () => Promise<void>;
  registerEvaluation: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  lastResult: null,
  isEvaluating: false,
  suggestions: [],
  isFetchingSuggestions: false,
  evaluationsUsed: 0,
  freeLimitReached: false,
  isPremium: false,
  session: null,
  user: null,
  authReady: false,

  setProfile: (updates) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),

  saveProfile: async () => {
    const { profile } = get();
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  loadProfile: async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as StyleProfile;
      set({ profile: { ...DEFAULT_PROFILE, ...saved } });
    }
  },

  setLastResult: (result) => set({ lastResult: result }),
  setIsEvaluating: (val) => set({ isEvaluating: val }),
  setSuggestions: (items) => set({ suggestions: items }),
  setIsFetchingSuggestions: (val) => set({ isFetchingSuggestions: val }),

  loadQuota: async () => {
    const used = await getEvaluationsUsed();
    set({ evaluationsUsed: used, freeLimitReached: limitReached(used, get().isPremium) });
  },

  registerEvaluation: async () => {
    const used = await consumeEvaluation();
    set({ evaluationsUsed: used, freeLimitReached: limitReached(used, get().isPremium) });
  },

  initAuth: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      authReady: true,
    });
    await syncPremium(data.session?.user?.id, set, get);
    // Mantém o estado em sincronia com login/logout/refresh de token.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      void syncPremium(session?.user?.id, set, get);
    });
  },
}));
