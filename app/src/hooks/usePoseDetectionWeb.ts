import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseStatus } from "../constants/pose";

// Detecção de pose para a WEB (espelho no navegador). vision-camera/tflite NÃO
// rodam no browser, então usamos o MediaPipe Tasks Vision `PoseLandmarker`.
// Mesma ideia do nativo (usePoseDetection.ts): keypoints de topo (cabeça/ombros)
// e de baixo (joelhos/tornozelos) visíveis → classifica none/top/bottom/full.
//
// ponytail: ZERO dependência npm e ZERO peso de bundle — o módulo, o WASM e o
// modelo são carregados do CDN em runtime. O `new Function(...)` esconde o
// dynamic import do Metro (que não sabe empacotar URL externa); o browser faz
// o import ESM nativo. Arquivo só-web: importado apenas por MirrorScreen.tsx.

const MP_VERSION = "0.10.18";
const ESM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Índices dos landmarks do BlazePose (33 pontos do MediaPipe Pose).
const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;
const VIS = 0.5; // visibilidade mínima (0..1) p/ considerar o ponto enquadrado

type Landmark = { visibility?: number };

function classify(lm: Landmark[]): PoseStatus {
  const vis = (i: number) => (lm[i]?.visibility ?? 0) > VIS;
  const top = vis(NOSE) || vis(L_SHOULDER) || vis(R_SHOULDER);
  const bottom = vis(L_KNEE) || vis(R_KNEE) || vis(L_ANKLE) || vis(R_ANKLE);
  if (top && bottom) return "full";
  if (top) return "top";
  if (bottom) return "bottom";
  return "none";
}

// Dynamic import nativo do browser, invisível ao bundler.
const cdnImport = (url: string): Promise<any> =>
  (new Function("u", "return import(u)") as (u: string) => Promise<any>)(url);

interface PoseLandmarkerWeb {
  ready: boolean;
  error: string | null;
  /** Roda a detecção no frame atual do <video>. null = detector ainda não pronto. */
  detect: (video: HTMLVideoElement) => PoseStatus | null;
}

export function usePoseLandmarkerWeb(): PoseLandmarkerWeb {
  const landmarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await cdnImport(ESM_URL);
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const lm = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          lm.close?.();
          return;
        }
        landmarkerRef.current = lm;
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
      try {
        landmarkerRef.current?.close?.();
      } catch {}
      landmarkerRef.current = null;
    };
  }, []);

  const detect = useCallback((video: HTMLVideoElement): PoseStatus | null => {
    const lm = landmarkerRef.current;
    if (!lm || !video.videoWidth) return null;
    try {
      const res = lm.detectForVideo(video, performance.now());
      const landmarks = res?.landmarks?.[0] as Landmark[] | undefined;
      return landmarks ? classify(landmarks) : "none";
    } catch {
      return null;
    }
  }, []);

  return { ready, error, detect };
}
