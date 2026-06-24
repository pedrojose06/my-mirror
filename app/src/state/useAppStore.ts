import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";
import { getEvaluationsUsed, consumeEvaluation } from "../services/deviceQuota";
import { supabase } from "../services/supabase";
import { FREE_EVALUATION_LIMIT } from "../constants";

const PROFILE_KEY = "@espelhoia:profile";

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
    set({ evaluationsUsed: used, freeLimitReached: used >= FREE_EVALUATION_LIMIT });
  },

  registerEvaluation: async () => {
    const used = await consumeEvaluation();
    set({ evaluationsUsed: used, freeLimitReached: used >= FREE_EVALUATION_LIMIT });
  },

  initAuth: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      authReady: true,
    });
    // Mantém o estado em sincronia com login/logout/refresh de token.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },
}));
