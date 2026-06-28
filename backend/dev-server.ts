// Servidor local de desenvolvimento — roda o handler da Vercel sem precisar de login/deploy.
// Uso: npm run dev:local  (porta 3000). Para produção continua usando Vercel.
import "dotenv/config";
import { createServer } from "node:http";
import evaluateHandler from "./api/evaluate";
import speakHandler from "./api/speak";
import suggestionsHandler from "./api/suggestions";

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {
  // Coletar corpo da requisição
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  let body: unknown = undefined;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }

  // CORS (espelha o vercel.json)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Id");

  // Rotas: /api/evaluate e /api/speak
  const handler = req.url?.startsWith("/api/evaluate")
    ? evaluateHandler
    : req.url?.startsWith("/api/speak")
    ? speakHandler
    : req.url?.startsWith("/api/suggestions")
    ? suggestionsHandler
    : null;

  if (!handler) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Rota não encontrada" }));
    return;
  }

  // Aumenta o res nativo do Node com os helpers que os handlers da Vercel usam
  // (status/json). Assim setHeader/write/end nativos seguem funcionando.
  const vres: any = res;
  vres.status = (code: number) => {
    res.statusCode = code;
    return vres;
  };
  vres.json = (data: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return vres;
  };

  const query = Object.fromEntries(
    new URL(req.url ?? "/", `http://localhost:${PORT}`).searchParams
  );
  const vReq = { method: req.method, body, headers: req.headers, query };
  await handler(vReq as never, vres as never);
});

server.listen(PORT, () => {
  console.log(`[dev-server] backend rodando em http://localhost:${PORT}`);
  console.log(`[dev-server] MOCK_AI=${process.env.MOCK_AI ?? "(não definido)"}`);
});
