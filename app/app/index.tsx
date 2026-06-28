// Rota web-safe: só re-exporta a tela. O Metro resolve a variante por plataforma
// no import — web usa MirrorScreen.tsx, iOS/Android usam MirrorScreen.native.tsx.
// Assim a vision-camera (nativa) nunca entra no bundle web. Não importar nada
// nativo aqui: o context do expo-router avalia este arquivo em todas as plataformas.
export { default } from "../src/screens/MirrorScreen";
