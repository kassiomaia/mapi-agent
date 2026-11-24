import { z } from "zod";
import { defineTool } from "./define-tool.js";
import type { CalculateInput } from "./types.js";

const operations = ["add", "subtract", "multiply", "divide"] as const;

const inputSchema = z.object({
  a: z.number().describe("Primeiro número"),
  operation: z.enum(operations).describe("Operação a executar: add (somar), subtract (subtrair), multiply (multiplicar) ou divide (dividir)"),
  b: z.number().describe("Segundo número"),
});

function calculate({ a, operation, b }: CalculateInput): number {
  switch (operation) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      if (b === 0) throw new Error("Division by zero");
      return a / b;
  }
}

export const calculateTool = defineTool({
  name: "calculate",
  description: "Executa uma operação aritmética entre dois números.",
  inputSchema,
  execute: async (input) => calculate(input),
  formatOutput: (result) => String(result),
});
