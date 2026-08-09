import { createOpenAI } from "@ai-sdk/openai";

/**
 * Alibaba Cloud Model Studio workspace endpoint, exposed via an
 * OpenAI-compatible API. The provider is built from `createOpenAI`
 * (@ai-sdk/openai) pointed at the Model Studio base URL.
 */
const MODELSTUDIO_DEFAULT_BASE_URL =
  "https://ws-tnjldzt0y8y9na5y.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

const modelstudio = createOpenAI({
  baseURL: process.env.MODELSTUDIO_BASE_URL ?? MODELSTUDIO_DEFAULT_BASE_URL,
  apiKey: process.env.MODELSTUDIO_API_KEY,
});

/**
 * Default vision model used for receipt extraction.
 *
 * NOTE: the workspace denies `-latest` aliases (403 access_denied); only bare
 * model ids such as `qwen-vl-plus` are accepted.
 */
const MODELSTUDIO_MODEL_ID = process.env.MODELSTUDIO_MODEL ?? "qwen-vl-plus";

/**
 * The vision language model used by receipt extraction.
 *
 * `.chat()` is used instead of the default provider invocation because the
 * Model Studio workspace only supports `/chat/completions` — the default
 * call posts to the Responses API (`/responses`), which it rejects.
 */
export function getExtractionModel() {
  return modelstudio.chat(MODELSTUDIO_MODEL_ID);
}
