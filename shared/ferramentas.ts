import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Definições das ferramentas (o que o MODELO enxerga: nome, descrição e JSON Schema)
// ---------------------------------------------------------------------------
export const ferramentas: Anthropic.Tool[] = [
  {
    name: "calcular",
    description: "Calcula uma expressão aritmética (+, -, *, /, parênteses). Use para qualquer conta.",
    input_schema: {
      type: "object",
      properties: {
        expressao: { type: "string", description: "Ex.: '(12 * 7) + 3'" },
      },
      required: ["expressao"],
    },
  },
  {
    name: "consultar_clima",
    description: "Retorna a temperatura atual em °C de uma cidade. Dados simulados.",
    input_schema: {
      type: "object",
      properties: {
        cidade: { type: "string", description: "Nome da cidade, ex.: 'Lisboa'" },
      },
      required: ["cidade"],
    },
  },
  {
    name: "salvar_nota",
    description: "Salva uma nota com título e conteúdo para o usuário consultar depois.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        conteudo: { type: "string" },
      },
      required: ["titulo", "conteudo"],
    },
  },
];

// Estado simples em memória, para os demos mostrarem o efeito das ferramentas.
export const notas: { titulo: string; conteudo: string }[] = [];

// ---------------------------------------------------------------------------
// Implementações locais (o código que REALMENTE roda na sua máquina)
// ---------------------------------------------------------------------------
const CLIMA_SIMULADO: Record<string, number> = {
  lisboa: 18,
  "sao paulo": 24,
  toquio: 15,
  "nova york": 9,
  londres: 12,
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function calcular(expressao: string): string {
  // Só aceita dígitos, operadores e parênteses. Com essa validação o uso de Function é
  // seguro para este exemplo didático. Em produção, use um parser de expressões de verdade.
  if (!/^[\d+\-*\/().\s]+$/.test(expressao)) {
    throw new Error("Expressão contém caracteres não permitidos.");
  }
  const valor = Function(`"use strict"; return (${expressao});`)();
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error("Resultado inválido.");
  }
  return String(valor);
}

function consultarClima(cidade: string): string {
  const temperatura = CLIMA_SIMULADO[normalizar(cidade)];
  if (temperatura === undefined) {
    // Erros lançados aqui viram tool_result com is_error: true, e o modelo pode reagir a eles.
    throw new Error(`Cidade não encontrada: ${cidade}`);
  }
  return `${cidade}: ${temperatura} °C`;
}

function salvarNota(titulo: string, conteudo: string): string {
  notas.push({ titulo, conteudo });
  return `Nota "${titulo}" salva (total de notas: ${notas.length}).`;
}

// Despacha o nome pedido pelo modelo para a função local correspondente.
export function executarFerramenta(nome: string, entrada: Record<string, unknown>): string {
  switch (nome) {
    case "calcular":
      return calcular(String(entrada.expressao ?? ""));
    case "consultar_clima":
      return consultarClima(String(entrada.cidade ?? ""));
    case "salvar_nota":
      return salvarNota(String(entrada.titulo ?? ""), String(entrada.conteudo ?? ""));
    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}
