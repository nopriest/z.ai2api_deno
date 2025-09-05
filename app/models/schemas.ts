/**
 * Application data models
 */

import { z } from "zod/mod.ts";

// Content part model for OpenAI's new content format
export const ContentPartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

export type ContentPart = z.infer<typeof ContentPartSchema>;

// Chat message model
export const MessageSchema = z.object({
  role: z.string(),
  content: z.union([z.string(), z.array(ContentPartSchema)]).optional(),
  reasoning_content: z.string().optional(),
  tool_calls: z.array(z.record(z.any())).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// OpenAI-compatible request model
export const OpenAIRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  stream: z.boolean().optional().default(false),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  tools: z.array(z.record(z.any())).optional(),
  tool_choice: z.any().optional(),
});

export type OpenAIRequest = z.infer<typeof OpenAIRequestSchema>;

// Model information item
export const ModelItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  owned_by: z.string(),
});

export type ModelItem = z.infer<typeof ModelItemSchema>;

// Upstream service request model
export const UpstreamRequestSchema = z.object({
  stream: z.boolean(),
  model: z.string(),
  messages: z.array(MessageSchema),
  params: z.record(z.any()).default({}),
  features: z.record(z.any()).default({}),
  background_tasks: z.record(z.boolean()).optional(),
  chat_id: z.string().optional(),
  id: z.string().optional(),
  mcp_servers: z.array(z.string()).optional(),
  model_item: ModelItemSchema.optional(),
  tool_servers: z.array(z.string()).optional(),
  variables: z.record(z.string()).optional(),
});

export type UpstreamRequest = z.infer<typeof UpstreamRequestSchema>;

// Stream delta model
export const DeltaSchema = z.object({
  role: z.string().optional(),
  content: z.string().optional(),
  reasoning_content: z.string().optional(),
  tool_calls: z.array(z.record(z.any())).optional(),
});

export type Delta = z.infer<typeof DeltaSchema>;

// Response choice model
export const ChoiceSchema = z.object({
  index: z.number(),
  message: MessageSchema.optional(),
  delta: DeltaSchema.optional(),
  finish_reason: z.string().optional(),
});

export type Choice = z.infer<typeof ChoiceSchema>;

// Token usage statistics
export const UsageSchema = z.object({
  prompt_tokens: z.number().default(0),
  completion_tokens: z.number().default(0),
  total_tokens: z.number().default(0),
});

export type Usage = z.infer<typeof UsageSchema>;

// OpenAI-compatible response model
export const OpenAIResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChoiceSchema),
  usage: UsageSchema.optional(),
});

export type OpenAIResponse = z.infer<typeof OpenAIResponseSchema>;

// Upstream error model
export const UpstreamErrorSchema = z.object({
  detail: z.string(),
  code: z.number(),
});

export type UpstreamError = z.infer<typeof UpstreamErrorSchema>;

// Inner upstream data model
export const UpstreamDataInnerSchema = z.object({
  error: UpstreamErrorSchema.optional(),
});

export type UpstreamDataInner = z.infer<typeof UpstreamDataInnerSchema>;

// Upstream data content model
export const UpstreamDataDataSchema = z.object({
  delta_content: z.string().default(""),
  edit_content: z.string().default(""),
  phase: z.string().default(""),
  done: z.boolean().default(false),
  usage: UsageSchema.optional(),
  error: UpstreamErrorSchema.optional(),
  inner: UpstreamDataInnerSchema.optional(),
});

export type UpstreamDataData = z.infer<typeof UpstreamDataDataSchema>;

// Upstream data model
export const UpstreamDataSchema = z.object({
  type: z.string(),
  data: UpstreamDataDataSchema,
  error: UpstreamErrorSchema.optional(),
});

export type UpstreamData = z.infer<typeof UpstreamDataSchema>;

// Model information for listing
export const ModelSchema = z.object({
  id: z.string(),
  object: z.string().default("model"),
  created: z.number(),
  owned_by: z.string(),
});

export type Model = z.infer<typeof ModelSchema>;

// Models list response model
export const ModelsResponseSchema = z.object({
  object: z.string().default("list"),
  data: z.array(ModelSchema),
});

export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
