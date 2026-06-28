import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { API_BASE_URL } from "../constants";
import { supabase } from "./supabase";

// Tempo máximo aguardando o stream começar antes de cair pra voz do sistema.
const STREAM_START_TIMEOUT_MS = 7000;

// Garante que o áudio toque mesmo com o celular no silencioso.
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

let playToken = 0;
let activePlayer: AudioPlayer | null = null;

// Fala o texto com a voz neural do Gemini em STREAMING: o player toca o
// áudio conforme ele é transmitido, começando em ~2s. Se falhar, cai para
// a voz sintética do sistema.
// onStart é chamado UMA vez quando a voz começa de fato (ou no fallback),
// para a UI poder revelar o resultado só quando a fala chega.
export async function speak(text: string, onStart?: () => void): Promise<void> {
  const myToken = ++playToken;
  let startFired = false;
  const fireStart = () => {
    if (!startFired) {
      startFired = true;
      onStart?.();
    }
  };

  const fallback = () => {
    Speech.speak(text, { language: "pt-BR", rate: 0.95 });
    fireStart();
  };

  if (activePlayer) {
    try {
      activePlayer.remove();
    } catch {}
    activePlayer = null;
  }

  // Voz neural é exclusiva de usuário logado (premium). Sem sessão, usa a voz
  // do sistema (grátis) e nem chama o backend — economiza a cota free-tier.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    fallback();
    return;
  }

  try {
    const url = `${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}`;
    const player = createAudioPlayer({
      uri: url,
      headers: { Authorization: `Bearer ${token}` },
    });
    activePlayer = player;

    const sub = player.addListener("playbackStatusUpdate", (s: any) => {
      if (myToken !== playToken) return;
      if (s?.playing || (s?.currentTime ?? 0) > 0) fireStart();
      if (s?.didJustFinish) {
        try {
          sub.remove();
        } catch {}
        try {
          player.remove();
        } catch {}
        if (activePlayer === player) activePlayer = null;
      }
    });

    player.play();

    // Se nada começou a tocar a tempo (rede/erro), usa a voz do sistema.
    setTimeout(() => {
      if (!startFired && myToken === playToken) {
        try {
          sub.remove();
          player.remove();
        } catch {}
        fallback();
      }
    }, STREAM_START_TIMEOUT_MS);
  } catch (err) {
    console.warn("[voice] streaming falhou, usando voz do sistema:", err);
    if (myToken === playToken) fallback();
    else fireStart();
  }
}

export function stopSpeaking(): void {
  playToken++;
  try {
    activePlayer?.pause();
  } catch {}
  Speech.stop();
}
