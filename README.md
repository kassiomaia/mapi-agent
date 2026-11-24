# Agentes de IA com a API da Anthropic (TypeScript + Bun)

Demos didáticos, um por tópico, para entender como um agente de IA funciona por dentro.

## Pré-requisitos

- [Bun](https://bun.sh) instalado (`bun --version`)
- Uma chave de API da Anthropic

## Instalação

```powershell
bun install
Copy-Item .env.example .env
# edite o .env e coloque sua ANTHROPIC_API_KEY
```

## Tópicos

| Comando | Tópico | Chama a API? |
| --- | --- | --- |
| `bun run t1` | 1. O que é um agente (chatbot x automação x agente) | Não |
| `bun run t2` | 2. Primeira requisição à Messages API | Sim |
| `bun run t3` | 3. Ferramentas: tool use e execução local | Sim |
| `bun run t4` | 4. Loop agêntico | Sim |
| `bun run t5` | 5. Teste de autonomia (multi-etapas) | Sim |
| `bun run t5 2` | 5. Mesmo teste, com limite de 2 passos | Sim |
| `bun run t6` | 6. Recapitulação e perguntas | Não |

## Estrutura

```
shared/
  cliente.ts          cliente da API, modelo padrão e helpers de impressão
  ferramentas.ts      definições (JSON Schema) e implementações locais das tools
01-conceitos/         chatbot x automação x agente (simulado, sem API)
02-primeira-requisicao/  messages.create, system prompt, usage e falta de memória
03-ferramentas/       tools com JSON Schema e execução local de tool_use
04-loop-agentico/     agente.ts (o loop) + index.ts (uso do loop)
05-teste-autonomia/   tarefa com várias etapas, erros e limite de passos
06-conclusoes/        arquitetura, aplicações e perguntas
```

## Conceitos-chave

- **Ferramenta**: `name` + `description` + `input_schema` (JSON Schema). O modelo lê isso para decidir quando usar.
- **tool_use**: o modelo pede a execução. Quem executa é o **seu código**.
- **tool_result**: a resposta da ferramenta volta ao modelo, com o mesmo `tool_use_id`.
- **stop_reason**: `"tool_use"` significa que há mais passos; `"end_turn"` significa que terminou.
- **Limite de passos**: sem ele, um agente pode repetir ações indefinidamente.
- **Estado**: a API não guarda memória. O histórico de `messages` é o estado do agente.

## Modelo

O padrão é `claude-sonnet-5-5`. Para trocar, defina `ANTHROPIC_MODEL` no `.env`, por exemplo `claude-haiku-5-5` para custo menor.

## Verificação de tipos

```powershell
bun run typecheck
```
