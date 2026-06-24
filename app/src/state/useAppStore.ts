import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleProfile, EvaluationResult, SuggestionItem } from "../constants/types";
import { getEvaluationsUsed, consumeEvaluation } from "../services/deviceQuota";
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

  setProfile: (profile: Partial<StyleProfile>) => void;
  saveProfile: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setLastResult: (result: EvaluationResult | null) => void;
  setIsEvaluating: (val: boolean) => void;
  setSuggestions: (items: SuggestionItem[]) => void;
  setIsFetchingSuggestions: (val: boolean) => void;
  loadQuota: () => Promise<void>;
  registerEvaluation: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  lastResult: null,
  isEvaluating: false,
  suggestions: [],
  isFetchingSuggestions: false,
  evaluationsUsed: 0,
  freeLimitReached: false,

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
}));
