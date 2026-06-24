import { useCallback, type RefObject } from "react";
import type { Camera } from "react-native-vision-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useAppStore } from "../state/useAppStore";
import { evaluateLook, fetchSuggestions } from "../services/api";
import { speak } from "../services/voice";
import {
  CAPTURE_IMAGE_WIDTH,
  CAPTURE_IMAGE_COMPRESS,
  type CaptureMode,
} from "../constants/pose";

interface UseLookEvaluationArgs {
  cameraRef: RefObject<Camera | null>;
  setMode: (mode: CaptureMode) => void;
  onSettled: () => void; // reseta estado de pose/streak após a captura
}

// Normaliza o caminho da foto para uma URI file:// utilizável.
function toFileUri(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/**
 * Pipeline de captura → avaliação: tira a foto, comprime, chama a avaliação,
 * dispara a busca de sugestões em paralelo e narra o resumo. Mantém o estado
 * "evaluating" até a voz começar, então revela a nota.
 */
export function useLookEvaluation({
  cameraRef,
  setMode,
  onSettled,
}: UseLookEvaluationArgs) {
  const profile = useAppStore((s) => s.profile);
  const setLastResult = useAppStore((s) => s.setLastResult);
  const setIsEvaluating = useAppStore((s) => s.setIsEvaluating);
  const setSuggestions = useAppStore((s) => s.setSuggestions);
  const setIsFetchingSuggestions = useAppStore(
    (s) => s.setIsFetchingSuggestions
  );

  return useCallback(async () => {
    setMode("evaluating");
    setIsEvaluating(true);
    setSuggestions([]);
    try {
      const photo = await cameraRef.current!.takePhoto({
        enableShutterSound: false,
      });

      const manipulated = await ImageManipulator.manipulateAsync(
        toFileUri(photo.path),
        [{ resize: { width: CAPTURE_IMAGE_WIDTH } }],
        {
          compress: CAPTURE_IMAGE_COMPRESS,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      if (!manipulated.base64) throw new Error("Falha ao processar imagem");

      const resultado = await evaluateLook(manipulated.base64, profile);

      // Busca sugestões em paralelo com a voz (não bloqueia o fluxo)
      if (resultado.descricao_look) {
        setIsFetchingSuggestions(true);
        fetchSuggestions(resultado.descricao_look, profile)
          .then(setSuggestions)
          .finally(() => setIsFetchingSuggestions(false));
      }

      // Mantém o "Analisando..." até a voz começar; aí revela a nota + fala juntos.
      speak(resultado.resumo_voz, () => {
        setLastResult(resultado);
        setMode("idle");
      });
    } catch (err) {
      console.error("[capture] erro:", err);
      speak("Não consegui avaliar o look agora. Tente novamente.", () => {
        setMode("idle");
      });
    } finally {
      setIsEvaluating(false);
      onSettled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
}
