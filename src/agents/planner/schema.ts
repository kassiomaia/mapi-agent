import { z } from "zod";

const text = z.string().trim().min(1);

export const tripPlanContentSchema = z.object({
  tagline: text.describe("Uma frase curta e animada que resume o destino, sem exclamações"),
  summary: text.describe("Dois ou três frases sobre o que esperar da viagem"),
  bestFor: z.array(text).describe("De 2 a 4 perfis de viajante para quem o destino é ótimo, por exemplo: casais, quem gosta de museus"),
  facts: z
    .object({
      language: text.optional().describe("Idioma local"),
      currency: text.optional().describe("Moeda local e câmbio aproximado, se a pesquisa trouxer"),
      power: text.optional().describe("Tipo de tomada e voltagem"),
    })
    .describe("Informações rápidas; omita o que não souber"),
  itinerary: z
    .array(
      z.object({
        day: z.number().int().min(1),
        title: text.describe("Tema do dia, por exemplo: Alfama e o castelo"),
        morning: text,
        afternoon: text,
        evening: text,
        wikipediaTitle: text.describe(
          "Título do artigo na Wikipedia em inglês sobre o lugar principal do dia, para buscar a foto, por exemplo: Alfama, Sintra, Trastevere. " +
            "Use um lugar específico e diferente em cada dia, nunca o nome da própria cidade nem um lugar já usado em atrações, comida ou bairros",
        ),
      }),
    )
    .describe("Roteiro dia a dia, com o número de dias pedido"),
  attractions: z
    .array(
      z.object({
        name: text,
        description: text,
        tip: text.optional(),
        wikipediaTitle: text.describe(
          "Título do artigo sobre a atração na Wikipedia em inglês, para buscar a foto, por exemplo: Colosseum, Trevi Fountain, Belém Tower",
        ),
      }),
    )
    .describe("Até 8 atrações, das mais imperdíveis para as menos"),
  food: z
    .array(
      z.object({
        name: text,
        description: text,
        wikipediaTitle: text.describe(
          "Título do artigo sobre o prato na Wikipedia em inglês, para buscar a foto, por exemplo: Carbonara, Pastel de nata, Supplì",
        ),
      }),
    )
    .describe("Até 6 pratos, doces ou bebidas típicas, com onde provar"),
  neighborhoods: z
    .array(
      z.object({
        name: text,
        description: text,
        goodFor: text,
        wikipediaTitle: text.describe(
          "Título do artigo sobre o bairro na Wikipedia em inglês, para buscar a foto, por exemplo: Trastevere, Alfama, Le Marais",
        ),
      }),
    )
    .describe("Até 4 bairros para se hospedar"),
  tips: z.array(z.object({ topic: text, text })).describe("Até 6 dicas práticas: transporte, dinheiro, segurança, gorjeta, chip"),
  events: z
    .array(z.object({ name: text, when: text, description: text }))
    .describe("Até 4 eventos ou festas no período da viagem; lista vazia se a pesquisa não trouxer nada"),
  budget: z
    .object({
      currency: text,
      economic: text.describe("Faixa diária por pessoa no estilo econômico"),
      comfortable: text.describe("Faixa diária por pessoa no estilo conforto"),
      luxury: text.describe("Faixa diária por pessoa no estilo luxo"),
      note: text.describe("O que a faixa inclui e de onde veio a estimativa"),
    })
    .optional()
    .describe("Estimativa de gasto diário; omita se a pesquisa não trouxer valores"),
  packing: z.array(text).describe("De 4 a 8 itens para levar na mala, de acordo com o clima e o roteiro"),
});
