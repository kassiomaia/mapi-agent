import Anthropic from "@anthropic-ai/sdk";

// Modelo usado em todos os demos. Pode ser trocado pela variável ANTHROPIC_MODEL.
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

// Cria o cliente da API. O SDK lê ANTHROPIC_API_KEY do ambiente (ou do arquivo .env).
export function criarCliente(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY não encontrada.");
    console.error("   Copie .env.example para .env e preencha sua chave.");
    process.exit(1);
  }
  return new Anthropic();
}

// Concatena apenas os blocos de texto de uma resposta.
export function textoDa(mensagem: Anthropic.Message): string {
  return mensagem.content
    .flatMap((bloco) => (bloco.type === "text" ? [bloco.text] : []))
    .join("\n");
}

export const cores = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

export function titulo(texto: string): void {
  console.log(`\n${cores.bold}${cores.cyan}=== ${texto} ===${cores.reset}\n`);
}
