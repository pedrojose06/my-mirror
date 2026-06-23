# EspelhoIA — Mirror App

App mobile que usa a câmera como um **espelho inteligente**: detecta quando você
aparece de corpo inteiro, captura o look automaticamente, manda para uma IA
avaliar e devolve um feedback falado com voz neural natural.

> Versão atual: **v0.1.0 (MVP)** — ponto estável marcado por tag no Git.

---

## Como funciona (fluxo de ponta a ponta)

1. **Enquadramento** — a câmera roda em tempo real. Ao tocar em *Avaliar*, o app
   começa a analisar cada frame procurando o corpo inteiro e vai guiando
   ("só a parte de cima aparecendo", "corpo inteiro detectado!").
2. **Captura automática** — quando cabeça/ombros **e** pernas/pés estão visíveis,
   o app tira a foto sozinho (sem som de obturador) e mostra "Analisando…".
3. **Avaliação por IA** — a foto vai para o backend, que pede ao Gemini uma
   avaliação estruturada do look (nota, pontos fortes, sugestões, adequação).
4. **Voz neural** — o resumo é narrado com a voz neural do Gemini, transmitida em
   streaming para começar a falar rápido. A tela só revela a nota quando a voz
   começa, para a espera parecer natural.

---

## Arquitetura

```
my-mirror/                 (repositório único — app + backend juntos)
├── app/                   # App mobile (Expo / React Native)
│   ├── app/               # Telas (expo-router): câmera, perfil, resultado
│   ├── src/services/      # api.ts (avaliação) e voice.ts (voz)
│   ├── src/state/         # estado global (zustand) + perfil persistido
│   ├── src/hooks/ constants/
│   └── assets/models/     # modelo MoveNet (.tflite) embarcado
└── backend/               # Funções serverless (Vercel)
    ├── api/evaluate.ts    # recebe imagem+perfil → avaliação (Gemini)
    ├── api/speak.ts       # texto → voz neural (Gemini TTS, em streaming)
    └── src/lib/           # ai.ts (Gemini), schema.ts (Zod), promptBuilder.ts
```

O app **nunca fala direto com o Gemini**: ele chama o backend na Vercel, que
guarda a chave da API e centraliza os prompts. Isso mantém a chave fora do
celular e permite trocar de modelo/voz sem republicar o app.

---

## Stack e decisões técnicas

Cada escolha abaixo está justificada pelo **papel** que cumpre e pelo **porquê**
de ter sido preferida a alternativas.

### Camada mobile (pasta `app/`)

| Tecnologia | Papel no app | Por que essa escolha |
|---|---|---|
| **Expo (SDK 54) + React Native** | Base do app mobile | Expo dá acesso fácil a câmera, áudio, build e atualização de JS sem mexer em código nativo na maior parte do tempo. RN permite uma base única para Android/iOS. |
| **expo-router** | Navegação entre telas (câmera → perfil → resultado) | Navegação baseada em arquivos, simples e oficial do Expo. |
| **react-native-vision-camera (v4)** | Câmera com acesso aos frames em tempo real | É a única biblioteca de câmera RN que expõe os frames ao vivo (frame processors), necessário para a detecção de pose. A `expo-camera` só tira foto, não dá os pixels do vídeo. Fixada na v4 porque a v5 (nova, baseada em Nitro) ainda é instável; a v4 recebeu um pequeno patch para compatibilidade com RN 0.81 (ver `scripts/patch-vision-camera.js`). |
| **react-native-fast-tflite + MoveNet** | Detecção de pose **no aparelho** | Roda o modelo MoveNet (TensorFlow Lite) localmente para achar os 17 pontos do corpo. On-device = instantâneo, grátis e privado (a imagem não sai do celular nessa etapa). Escolhido em vez de mandar frames para a nuvem (lento e caro) ou ML Kit (menos flexível). |
| **vision-camera-resize-plugin** | Redimensiona/rotaciona o frame para o modelo | O MoveNet espera 192×192 RGB. Este plugin faz o resize dentro do frame processor. Também corrige a **rotação** do frame (a câmera entrega a imagem "deitada"), que era o motivo das pernas não serem detectadas. |
| **react-native-worklets-core** + **react-native-worklets** | Rodam o código de detecção na thread da câmera | Frame processors executam em *worklets* (fora da thread JS) para não travar a UI. `worklets-core` atende a vision-camera; `worklets` é exigido pelo reanimated. Os dois convivem via plugins no Babel. |
| **expo-image-manipulator** | Comprime/redimensiona a foto antes de enviar | Reduz a imagem para ~768px/JPEG 70% antes de mandar ao backend, cortando tamanho do upload e latência. |
| **expo-audio + expo-file-system** | Tocar a voz neural | `expo-audio` toca o áudio do Gemini direto da URL de streaming (começa a tocar antes de baixar tudo). Substituem a abordagem antiga de só `expo-speech`. |
| **expo-speech** | Voz de **fallback** | Se o áudio neural falhar (rede/erro), o app lê o texto com a voz sintética do aparelho, garantindo que o usuário sempre ouça algo. |
| **zustand** | Estado global (perfil, último resultado, modo) | Leve e simples, sem boilerplate de Redux. |
| **@react-native-async-storage/async-storage** | Persistir o perfil de estilo | Guarda as preferências do usuário entre sessões. |

### Camada backend (pasta `backend/`)

| Tecnologia | Papel | Por que essa escolha |
|---|---|---|
| **Vercel (funções serverless)** | Hospeda a API (`/api/evaluate`, `/api/speak`) | Deploy automático a cada `git push`, escala sozinho, free tier generoso. Guarda a chave da IA fora do app. |
| **@google/genai (Gemini)** | Avaliação de imagem **e** geração de voz | Um único provedor (e uma única chave) cobre visão + TTS. Tem **free tier** (modelos Flash), o que viabiliza testar sem custo. Escolhido no lugar do Claude justamente pelo free tier e pela TTS integrada. |
| **Modelo `gemini-2.5-flash`** | Analisa a foto e devolve o JSON da avaliação | Bom equilíbrio entre qualidade de visão, português e velocidade, dentro do free tier. (`gemini-flash-lite` ficou de reserva; modelos `*-latest`/Pro caem em cobrança.) |
| **Gemini TTS (`gemini-2.5-flash-preview-tts`)** | Converte o resumo em voz neural | Voz **Vindemiatrix**, temperatura 1.2, com instrução de estilo ("sorriso na voz, tom caloroso"). Muito mais natural que a voz do aparelho. Transmitido em **streaming** (`generateContentStream`) para a fala começar em ~2s em vez de esperar todo o áudio (~4-5s). |
| **Zod** | Valida o payload de entrada/saída | Garante que imagem e perfil chegam no formato certo e que a resposta da IA bate com o schema esperado, evitando dados malformados. |
| **Modo mock (`MOCK_AI=true`)** | Testar sem custo/sem chave | Devolve uma avaliação falsa válida, permitindo desenvolver o app inteiro sem gastar a API. |
| **dev-server.ts (tsx)** | Rodar a API localmente sem `vercel dev` | Servidor HTTP simples que executa os mesmos handlers, sem precisar de login na Vercel. |

### IA — por que Gemini (e não Claude)

O projeto começou mirando o Claude, mas migrou para o **Gemini** por três motivos:
o **free tier** (dá para usar de verdade sem cartão), a **visão** nativa para
analisar a foto, e a **TTS neural na mesma API** — o que evita integrar um
serviço de voz separado. Resumo na tela é detalhado; o resumo **falado** é uma
frase curta de propósito, porque o tempo de síntese da voz na nuvem tem um piso
de ~2s e textos curtos começam a tocar antes.

### Build e distribuição

| Decisão | Por quê |
|---|---|
| **Saiu do Expo Go → dev build / APK próprio** | A detecção de pose usa bibliotecas nativas (vision-camera, tflite, worklets) que **não existem no Expo Go**. Por isso o app virou um build nativo próprio. |
| **Build local (Android Studio + JDK 17)** em vez de EAS na nuvem | Build local é gratuito e rápido para iterar; o NDK/SDK ficam na máquina. EAS (nuvem) ficou como alternativa. |
| **Iteração rápida** | Depois do primeiro build nativo, mudanças em **código JS** atualizam por *hot-reload* (`expo start --dev-client`) sem recompilar. Só mudança em lib nativa exige rebuild. |
| **APK release standalone** | `gradlew assembleRelease` empacota o JS dentro do APK → o app roda **sem o PC/Metro** (só precisa de internet para a IA). |

---

## Pré-requisitos

- Node.js 20+
- Conta no Google AI Studio para a chave do Gemini — https://aistudio.google.com/apikey
  (a chave permanente começa com `AIzaSy...`)
- Para build nativo Android: **JDK 17** (Eclipse Temurin) + **Android Studio**
  (SDK Platform 36, Build-Tools, Platform-Tools, NDK). Variáveis `JAVA_HOME` e
  `ANDROID_HOME` configuradas.

## Setup

### Backend (local)

```bash
cd backend
cp .env.example .env        # ver variáveis abaixo
npm install
npm run dev:local           # API em http://localhost:3000 (sem precisar da Vercel)
```

Em produção, o backend roda na Vercel (deploy automático a cada push). As
variáveis de ambiente ficam em **Settings → Environment Variables** do projeto.

### App (dev build no celular)

```bash
cd app
npm install                 # roda o postinstall que aplica o patch da vision-camera
npx expo run:android        # 1º build nativo + instala no celular (USB, depuração ativa)
# depois, para iterar só JS:
npx expo start --dev-client
```

### Gerar o APK standalone (usar sem PC)

```bash
cd app/android
./gradlew assembleRelease   # gera app/android/app/build/outputs/apk/release/app-release.apk
adb install -r <caminho do apk>
```

## Variáveis de ambiente (backend)

| Variável | Função |
|---|---|
| `GEMINI_API_KEY` | Chave do Gemini (obrigatória para IA real) |
| `MOCK_AI` | `true` = avaliação/voz falsas, sem custo; `false` = Gemini real |
| `GEMINI_MODEL` | (opcional) modelo de avaliação — padrão `gemini-2.5-flash` |
| `GEMINI_TTS_MODEL` | (opcional) modelo de voz — padrão `gemini-2.5-flash-preview-tts` |
| `GEMINI_TTS_VOICE` | (opcional) voz — padrão `Vindemiatrix` |
| `GEMINI_TTS_TEMPERATURE` | (opcional) expressividade da voz — padrão `1.2` |

No app, `EXPO_PUBLIC_API_URL` (em `app/.env`) aponta para o backend
(Vercel em produção, ou o IP da máquina em desenvolvimento local).

## Validar o backend pelo terminal

```bash
# Avaliação (mock ou real conforme MOCK_AI):
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"imagem_base64":"<base64 do jpeg>","perfil":{"ocasiao":"casual","estilo":"minimalista","cores_que_gosta":["azul"],"cores_que_evita":[],"formalidade":"baixa"}}'

# Voz em streaming (devolve um WAV):
curl "https://<seu-deploy>.vercel.app/api/speak?text=Seu%20look%20ficou%20otimo!" --output voz.wav
```

## Versionamento

Tag **`v0.1.0`** marca o MVP estável (app + backend). Para voltar a esse ponto:

```bash
git checkout v0.1.0
```
