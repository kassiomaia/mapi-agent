import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { createChatSocketHandlers } from "./chat-socket.js";
import { HomePage } from "./views/home.js";
import type { AppOptions } from "./types.js";

export function createApp(options: AppOptions) {
  const app = new Hono();
  const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

  app.use(
    "/static/*",
    serveStatic({
      root: "./public",
      rewriteRequestPath: (path) => path.replace(/^\/static/, ""),
    }),
  );

  app.get("/", (c) => c.html(<HomePage />));

  app.get(
    "/ws",
    upgradeWebSocket(() => createChatSocketHandlers(options)),
  );

  return { app, injectWebSocket };
}
