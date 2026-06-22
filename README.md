# EspelhoIA — Mirror App

App mobile que usa a câmera como espelho inteligente, entregando avaliações de look por IA com feedback por voz.

## Estrutura

```
my-mirror/
├── backend/        # Vercel Function — proxy seguro para Claude API
└── app/            # Expo app — câmera, TTS, perfil de estilo
```

## Pré-requisitos

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- Conta Vercel (já conectada)
- `ANTHROPIC_API_KEY` no `.env` do backend

## Setup rápido

```bash
# Backend
cd backend
cp .env.example .env   # preencher ANTHROPIC_API_KEY
npm install
npm run dev            # roda localmente em http://localhost:3000

# App
cd app
npm install
npx expo start
```

## Validar backend primeiro (antes de abrir o app)

```bash
# Com o backend rodando localmente:
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "imagem_base64": "'"$(base64 -w0 /caminho/para/foto.jpg)"'",
    "perfil": {
      "ocasiao": "casual",
      "estilo": "minimalista",
      "cores_que_gosta": ["azul", "branco"],
      "cores_que_evita": ["amarelo"],
      "formalidade": "baixa"
    }
  }'
```

## Roadmap

- **Fase 1** (semana 1-2): Validar endpoint backend com curl
- **Fase 2** (semana 3-4): Tela câmera + chamada API + resultado em texto
- **Fase 3** (semana 5): TTS (expo-speech) + perfil de estilo
- **Fase 4** (semana 6-7): Polish UX, acessibilidade, testes VoiceOver/TalkBack
