import type { FC } from "hono/jsx";
import { Layout } from "./layout.js";

export const HomePage: FC = () => (
  <Layout title="Mapi, seu agente de férias">
    <div id="root"></div>
    <script type="module" src="/static/build/main.js"></script>
  </Layout>
);
