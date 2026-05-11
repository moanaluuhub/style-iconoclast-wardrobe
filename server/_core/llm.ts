// LLM helper backed by the official OpenAI SDK.
// Public surface (`invokeLLM`, message/tool/response types) is preserved so
// callers in server/routers.ts and elsewhere don't need to change.
//
// Model is configurable via OPENAI_MODEL (default: gpt-4o-mini, the cheapest
// fast model with vision + JSON-schema support).

import OpenAI, { type ClientOptions } from "openai";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const options: ClientOptions = { apiKey };
  if (process.env.OPENAI_BASE_URL) options.baseURL = process.env.OPENAI_BASE_URL;
  _client = new OpenAI(options);
  return _client;
}

function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

const ensureArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

function normalizeMessage(message: Message) {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content } as const;
  }

  const parts = ensureArray(message.content).map((part) => {
    if (typeof part === "string") return { type: "text", text: part } as const;
    if (part.type === "text") return part;
    if (part.type === "image_url") return part;
    // FileContent isn't natively supported by chat completions — flatten into a
    // text block referencing the URL so callers don't crash.
    if (part.type === "file_url") {
      return { type: "text", text: `[file: ${part.file_url.url}]` } as const;
    }
    throw new Error("Unsupported message content part");
  });

  if (parts.length === 1 && parts[0].type === "text") {
    return { role, name, content: parts[0].text } as const;
  }

  return { role, name, content: parts } as const;
}

function normalizeToolChoice(
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    }
    return { type: "function", function: { name: tools[0].function.name } };
  }

  if ("name" in toolChoice) {
    return { type: "function", function: { name: toolChoice.name } };
  }
  return toolChoice;
}

function normalizeResponseFormat({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: Pick<
  InvokeParams,
  "responseFormat" | "response_format" | "outputSchema" | "output_schema"
>): ResponseFormat | undefined {
  const explicit = responseFormat || response_format;
  if (explicit) {
    if (explicit.type === "json_schema" && !explicit.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicit;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

  const messages = params.messages.map(normalizeMessage);
  const toolChoice = normalizeToolChoice(
    params.toolChoice || params.tool_choice,
    params.tools
  );
  const responseFormat = normalizeResponseFormat(params);

  const completion = await client.chat.completions.create({
    model: getModel(),
    // OpenAI SDK accepts the same shape we produce; cast to keep our public
    // type surface stable rather than coupling to the SDK's union types.
    messages: messages as never,
    ...(params.tools && params.tools.length > 0 ? { tools: params.tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(responseFormat ? { response_format: responseFormat as never } : {}),
    max_tokens: params.maxTokens ?? params.max_tokens ?? 32768,
  });

  // The SDK return type already matches our InvokeResult shape closely; pass
  // through with a cast since the union types diverge on edge cases.
  return completion as unknown as InvokeResult;
}
