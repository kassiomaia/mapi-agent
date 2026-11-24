import { z } from "zod";

const statItemSchema = z.object({
  label: z.string().min(1).max(60).describe("Nome do indicador"),
  value: z.string().min(1).max(60).describe("Valor já formatado, por exemplo: 16,2 °C"),
  hint: z.string().max(120).optional().describe("Detalhe curto opcional"),
});

const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(2000),
});

const statsBlockSchema = z.object({
  type: z.literal("stats"),
  items: z.array(statItemSchema).min(1).max(8),
});

const tableBlockSchema = z.object({
  type: z.literal("table"),
  columns: z.array(z.string().min(1).max(60)).min(1).max(8),
  rows: z.array(z.array(z.string().max(200)).min(1).max(8)).min(1).max(50),
});

const listBlockSchema = z.object({
  type: z.literal("list"),
  items: z.array(z.string().min(1).max(300)).min(1).max(20),
});

const meterBlockSchema = z
  .object({
    type: z.literal("meter"),
    label: z.string().min(1).max(60),
    value: z.number(),
    min: z.number(),
    max: z.number(),
    unit: z.string().max(20).optional().describe("Unidade exibida ao lado do valor, por exemplo: °C ou km"),
  })
  .refine((meter) => meter.min < meter.max, { message: "min must be lower than max" });

export const leafBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  statsBlockSchema,
  tableBlockSchema,
  listBlockSchema,
  meterBlockSchema,
]);

const tabsBlockSchema = z.object({
  type: z.literal("tabs"),
  label: z.string().min(1).max(60).describe("Nome acessível do grupo de abas"),
  tabs: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        blocks: z.array(leafBlockSchema).min(1).max(10),
      }),
    )
    .min(2)
    .max(6),
});

const accordionBlockSchema = z.object({
  type: z.literal("accordion"),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        blocks: z.array(leafBlockSchema).min(1).max(10),
      }),
    )
    .min(1)
    .max(10),
});

export const blockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  statsBlockSchema,
  tableBlockSchema,
  listBlockSchema,
  meterBlockSchema,
  tabsBlockSchema,
  accordionBlockSchema,
]);

export const uiSpecSchema = z.object({
  title: z.string().max(80).optional().describe("Título do cartão de resposta"),
  blocks: z.array(blockSchema).min(1).max(20),
});
