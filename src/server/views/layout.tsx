import type { FC, PropsWithChildren } from "hono/jsx";

export const Layout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta name="theme-color" content="#f2f9fb" />
      <link rel="icon" type="image/png" href="/static/brand/mapi.png" />
      <link rel="stylesheet" href="/static/build/main.css" />
      <link rel="stylesheet" href="/static/build/app.css" />
    </head>
    <body>{children}</body>
  </html>
);
