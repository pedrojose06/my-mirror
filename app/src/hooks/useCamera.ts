import { useRef, useCallback } from "react";
import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";
import { evaluateLook } from "../services/api";
import { useAppStore } from "../state/useAppStore";

export function useCamera() {
  const cameraRef = useRef<CameraView>(null);
  const { profile, setLastResult, setIsEvaluating, isEvaluating } = useAppStore();

  const capture = useCallback(async () => {
    if (!cameraRef.current || isEvaluating) return;

    setIsEvaluating(true);

    try {
      // 1. Capturar frame
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("Falha ao capturar foto");

      // 2. Redimensionar para reduzir payload (máx 768px, JPEG 70%)
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) throw new Error("Falha ao processar imagem");

      // 3. Enviar para o backend
      const resultado = await evaluateLook(manipulated.base64, profile);

      // 4. Salvar resultado no estado
      setLastResult(resultado);

      // 5. Falar o resumo via TTS
      Speech.speak(resultado.resumo_voz, {
        language: "pt-BR",
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (err) {
      console.error("[useCamera] Erro:", err);
      Speech.speak("Não consegui avaliar o look agora. Tente novamente.", {
        language: "pt-BR",
      });
    } finally {
      setIsEvaluating(false);
    }
  }, [cameraRef, profile, isEvaluating, setLastResult, setIsEvaluating]);

  return { cameraRef, capture, isEvaluating };
}
