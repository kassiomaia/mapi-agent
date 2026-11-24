// Tópico 5 — Teste de autonomia
// Enviamos uma tarefa com várias etapas e observamos as decisões do modelo.
// Também mostramos o limite de execução (maxPassos).
//
// Rode: bun run t5            -> limite padrão (10 passos)
//       bun run t5 2          -> limite de 2 passos, para ver o agente ser interrompido
import { executarAgente, imprimirPasso } from "../04-loop-agentico/agente.ts";
import { notas } from "../shared/ferramentas.ts";
import { titulo, cores } from "../shared/cliente.ts";

const limite = Number(process.argv[2] ?? 10);
titulo(`Tópico 5 — Teste de autonomia (limite: ${limite} passos)`);

// Tarefa com várias etapas, uma cidade inexistente (para testar o tratamento de erro)
// e uma conta que o modelo deve preferir fazer com a ferramenta.
const tarefa = `Faça um relatório de clima:
1. Consulte a temperatura de Lisboa, Tóquio, São Paulo e Atlântida.
2. Calcule a média das temperaturas que você conseguiu obter, usando a ferramenta calcular.
3. Se alguma cidade não tiver dados, registre isso e continue.
4. Salve uma nota com o título "Relatório de clima" contendo a média e as cidades sem dados.
5. Responda ao usuário com um resumo de uma frase.`;

const inicio = performance.now();

const resultado = await executarAgente({
  tarefa,
  maxPassos: limite,
  system:
    "Você é um agente que executa tarefas em várias etapas. Use as ferramentas quando precisar, " +
    "trate erros sem parar e responda em português.",
  onPasso: imprimirPasso,
});

const segundos = ((performance.now() - inicio) / 1000).toFixed(1);

console.log(`\n${cores.bold}--- Avaliação da autonomia ---${cores.reset}`);
console.log(`Passos usados: ${resultado.passos} de ${limite}`);
console.log(`Tempo: ${segundos} s`);
console.log(`Tokens: ${resultado.tokens.entrada} entrada, ${resultado.tokens.saida} saída`);

if (resultado.limiteAtingido) {
  console.log(
    `${cores.red}⚠ Limite de passos atingido antes de o modelo terminar.${cores.reset} ` +
      `Em produção, isso dispara uma parada segura ou pede ajuda humana.`,
  );
} else {
  console.log(`${cores.green}✓ O modelo concluiu a tarefa por conta própria.${cores.reset}`);
  console.log(`\nResposta final:\n${resultado.texto}`);
}

console.log(`\nNotas salvas pelo agente: ${notas.length}`);
for (const nota of notas) console.log(`  • ${nota.titulo}: ${nota.conteudo}`);
console.log("");
