// Tópico 4 — Construção ao vivo do agente (loop agêntico)
// A função executarAgente (em agente.ts) implementa o loop. Aqui só a usamos e observamos.
// Rode: bun run t4
import { executarAgente, imprimirPasso } from "./agente.ts";
import { titulo, cores } from "../shared/cliente.ts";

titulo("Tópico 4 — Loop agêntico");

const tarefa =
  "Quanto é 15% de 2480? Depois consulte o clima de Lisboa e salve uma nota " +
  "com o resultado da conta e a temperatura.";

const resultado = await executarAgente({
  tarefa,
  maxPassos: 6,
  onPasso: imprimirPasso,
});

console.log(`\n${cores.bold}Resposta final:${cores.reset}\n${resultado.texto}`);
console.log(
  `\n${cores.dim}Passos: ${resultado.passos} | Tokens: ${resultado.tokens.entrada} entrada, ` +
    `${resultado.tokens.saida} saída${cores.reset}\n`,
);
