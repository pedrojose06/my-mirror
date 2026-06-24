import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { FREE_EVALUATION_LIMIT } from "../constants";

// ---------------------------------------------------------------------------
// Quota de avaliações gratuitas por aparelho.
//
// Hoje a contagem é LOCAL (AsyncStorage) — é o MVP. O device ID estável já é
// resolvido aqui e enviado ao backend em cada avaliação, então a evolução para
// contagem server-side (à prova de reinstall, ex.: Upstash keyed pelo device ID)
// não muda a interface deste módulo nem o app.
// ---------------------------------------------------------------------------

const USED_KEY = "@luxai:evaluations_used";
const DEVICE_ID_KEY = "@luxai:device_id";

// UUID v4 simples (fallback quando o ID nativo não está disponível).
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedDeviceId: string | null = null;

/**
 * ID estável do aparelho. No Android usa o ANDROID_ID (sobrevive a reinstall);
 * no iOS, o idForVendor. Cai para um UUID persistido caso o nativo falhe.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let nativeId: string | null = null;
  try {
    nativeId =
      Platform.OS === "android"
        ? Application.getAndroidId()
        : await Application.getIosIdForVendorAsync();
  } catch {
    nativeId = null;
  }

  if (nativeId) {
    cachedDeviceId = nativeId;
    return nativeId;
  }

  // Fallback: UUID persistido localmente.
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const fresh = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  cachedDeviceId = fresh;
  return fresh;
}

/** Quantas avaliações já foram consumidas neste aparelho. */
export async function getEvaluationsUsed(): Promise<number> {
  const raw = await AsyncStorage.getItem(USED_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Ainda há avaliação gratuita disponível? */
export async function hasFreeEvaluation(): Promise<boolean> {
  return (await getEvaluationsUsed()) < FREE_EVALUATION_LIMIT;
}

/** Registra o consumo de uma avaliação e devolve o novo total. */
export async function consumeEvaluation(): Promise<number> {
  const next = (await getEvaluationsUsed()) + 1;
  await AsyncStorage.setItem(USED_KEY, String(next));
  return next;
}
