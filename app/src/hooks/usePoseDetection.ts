import { useMemo } from "react";
import { useFrameProcessor } from "react-native-vision-camera";
import { Worklets, useSharedValue } from "react-native-worklets-core";
import type { TensorflowModel } from "react-native-fast-tflite";
import type { useResizePlugin } from "vision-camera-resize-plugin";
import type { PoseStatus } from "../constants/pose";

// Índices dos keypoints do MoveNet (ordem oficial). Colocados junto do worklet
// que os usa, para o plugin de worklets capturá-los no mesmo módulo.
const NOSE = 0;
const L_SHOULDER = 5;
const R_SHOULDER = 6;
const L_KNEE = 13;
const R_KNEE = 14;
const L_ANKLE = 15;
const R_ANKLE = 16;
const CONF = 0.3; // confiança mínima por keypoint

type ResizeFn = ReturnType<typeof useResizePlugin>["resize"];

interface UsePoseDetectionArgs {
  model: TensorflowModel | undefined;
  resize: ResizeFn;
  aligning: ReturnType<typeof useSharedValue<boolean>>;
  cameraPosition: "front" | "back";
  onStatus: (status: PoseStatus) => void;
}

/**
 * Encapsula o frame processor que roda o MoveNet e classifica o enquadramento
 * do corpo (none/top/bottom/full), reportando mudanças via `onStatus` na thread JS.
 */
export function usePoseDetection({
  model,
  resize,
  aligning,
  cameraPosition,
  onStatus,
}: UsePoseDetectionArgs): ReturnType<typeof useFrameProcessor> {
  const updateStatusJS = useMemo(
    () => Worklets.createRunOnJS(onStatus),
    [onStatus]
  );

  const lastStatus = useSharedValue<PoseStatus>("none");

  return useFrameProcessor(
    (frame) => {
      "worklet";
      if (!aligning.value || model == null) return;

      const resized = resize(frame, {
        scale: { width: 192, height: 192 },
        pixelFormat: "rgb",
        dataType: "uint8",
        rotation: cameraPosition === "front" ? "270deg" : "90deg",
      });

      const outputs = model.runSync([resized as never]);
      const kp = outputs[0] as unknown as Float32Array; // [y,x,score]*17

      const score = (i: number) => kp[i * 3 + 2];

      const topVisible =
        score(NOSE) > CONF ||
        score(L_SHOULDER) > CONF ||
        score(R_SHOULDER) > CONF;
      // "Parte de baixo" = joelhos OU tornozelos visíveis (mais robusto)
      const bottomVisible =
        score(L_KNEE) > CONF ||
        score(R_KNEE) > CONF ||
        score(L_ANKLE) > CONF ||
        score(R_ANKLE) > CONF;

      let status: PoseStatus = "none";
      if (topVisible && bottomVisible) status = "full";
      else if (topVisible) status = "top";
      else if (bottomVisible) status = "bottom";

      if (status !== lastStatus.value || status === "full") {
        lastStatus.value = status;
        updateStatusJS(status);
      }
    },
    [model, aligning, updateStatusJS, lastStatus, cameraPosition, resize]
  );
}
