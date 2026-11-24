import { serve } from "@hono/node-server";
import { createClient } from "./agents/client.js";
import { loadConfig } from "./agents/config.js";
import { createApp } from "./server/app.js";

const config = loadConfig(process.env);
const client = createClient(config.provider, process.env);
const { app, injectWebSocket } = createApp({
  client,
  provider: config.provider,
  model: config.model,
  maxSteps: config.maxSteps,
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
injectWebSocket(server);
