// Tópico 6 — Conclusões e perguntas
// Recapitula a arquitetura dos demos e lista aplicações práticas. Não chama a API.
import { titulo, cores } from "../shared/cliente.ts";

titulo("Tópico 6 — Recapitulação da arquitetura");

console.log(`
  ${cores.bold}Usuário${cores.reset} ──objetivo──▶ ${cores.cyan}Modelo (Claude)${cores.reset} + histórico + ferramentas
                                      │
                    stop_reason === "tool_use"?
                       │ não                  │ sim
                       ▼                      ▼
                resposta final        seu código executa a ferramenta
                                              │
                                              ▼
                                  tool_result entra no histórico
                                              │
                                              └──▶ novo passo do modelo

  ${cores.dim}Resultado: a resposta final mais os efeitos no mundo (notas, APIs, arquivos...).
  O ciclo para quando o modelo termina ou quando o limite de passos é atingido.${cores.reset}
`);

titulo("O que vimos em cada tópico");
const topicos = [
  ["1", "Agente = objetivo + ferramentas + ciclo de execução (vs. chatbot e automação)"],
  ["2", "Messages API: model, system, messages. A API não guarda memória: o histórico é seu"],
  ["3", "Tools: name + description + JSON Schema. O modelo pede, o seu código executa"],
  ["4", "Loop: pensar -> agir -> observar, até stop_reason !== 'tool_use'"],
  ["5", "Autonomia real: várias etapas, tratamento de erros e limite de passos"],
];
for (const [numero, texto] of topicos) console.log(`  ${cores.bold}${numero}.${cores.reset} ${texto}`);

titulo("Aplicações práticas");
const aplicacoes = [
  "Suporte: consultar pedidos, status e abrir chamados em sistemas internos",
  "Análise de dados: consultar uma base, calcular indicadores e gerar um relatório",
  "Operações de TI: diagnosticar um alerta, ler logs e sugerir a correção",
  "Pesquisa: buscar fontes, resumir e registrar as conclusões",
];
for (const a of aplicacoes) console.log(`  • ${a}`);

titulo("Perguntas para discussão");
const perguntas = [
  "Que ferramentas da sua área poderiam virar tools? Qual seria o JSON Schema delas?",
  "Quais ações exigem aprovação humana antes de serem executadas?",
  "Como você mediria se o agente está fazendo o trabalho certo?",
  "Qual o custo de cada passo do loop? Como limitar tokens e tempo?",
];
perguntas.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

titulo("Próximo passo: Claude Agent SDK");
console.log(`  Este projeto usou a Messages API para mostrar o loop "na mão".
  Para produção, o pacote @anthropic-ai/claude-agent-sdk já traz o loop,
  ferramentas embutidas e controle de permissões prontos. Vale estudar depois que
  o ciclo estiver claro.
`);
