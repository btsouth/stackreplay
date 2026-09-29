import type { PublicModelSummary } from "./public-catalog";

type Specifications = NonNullable<PublicModelSummary["specifications"]>;
export interface ModelDecisionDetails {
  checkedAt: string;
  sources: Specifications["sources"];
  facts: { label: string; value: string }[];
  specifications?: Partial<Omit<Specifications, "sources">>;
  omitSpecifications?: ("contextTokens" | "maxInputTokens")[];
}

/** Public decision facts only. These never change execution routes, quotas or rate selection. */
export const MODEL_DECISION_DETAILS: Record<string, ModelDecisionDetails> = {
  "claude-fable-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/fable-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive (always on) · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "June 9, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than June 9, 2027",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jan 2026",
    },
  },
  "claude-opus-4-8": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/opus-4-8/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "May 28, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than May 28, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jan 2026",
    },
  },
  "claude-opus-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/opus-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "July 24, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than July 24, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
      {
        label: "Prompt caching",
        value:
          "Minimum eligible prompt: 512 tokens. Five-minute and one-hour cache writes have different prices.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "May 2026",
    },
  },
  "claude-fable-5-1": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/fable-5-1/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive (always on) · default effort high",
      },
      {
        label: "API availability",
        value: "Active (latest)",
      },
      {
        label: "Released",
        value: "September 1, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than September 1, 2027",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jun 2026",
    },
  },
  "claude-haiku-4-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/haiku-4-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Extended · no effort setting",
      },
      {
        label: "API availability",
        value: "Active (latest)",
      },
      {
        label: "Released",
        value: "October 15, 2025",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than October 15, 2026",
      },
    ],
    specifications: {
      contextTokens: 200000,
      maxOutputTokens: 64000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Feb 2025",
    },
  },
  "claude-opus-4-7": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/opus-4-7/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "April 16, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than April 16, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jan 2026",
    },
  },
  "claude-opus-5-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/opus-5-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive (always on) · default effort medium",
      },
      {
        label: "API availability",
        value: "Active (latest)",
      },
      {
        label: "Released",
        value: "September 22, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than September 22, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
      {
        label: "Prompt caching",
        value:
          "Minimum eligible prompt: 512 tokens. Five-minute and one-hour cache writes have different prices.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jun 2026",
    },
  },
  "claude-sonnet-4-6": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/sonnet-4-6/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive (extended deprecated) · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "February 17, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than February 17, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Aug 2025",
    },
  },
  "claude-sonnet-5-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive · default effort high",
      },
      {
        label: "API availability",
        value: "Active (latest)",
      },
      {
        label: "Released",
        value: "September 28, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than September 28, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
      {
        label: "Prompt caching",
        value:
          "Minimum eligible prompt: 512 tokens. Five-minute and one-hour cache writes have different prices.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jun 2026",
    },
  },
  "claude-sonnet-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/models/sonnet-5/overview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Adaptive · default effort high",
      },
      {
        label: "API availability",
        value: "Active (legacy)",
      },
      {
        label: "Released",
        value: "June 30, 2026",
      },
      {
        label: "Retirement commitment",
        value: "Not sooner than June 30, 2027",
      },
      {
        label: "Extended output",
        value:
          "Up to 300K output tokens on Message Batches with the output-300k-2026-03-24 beta header. Standard output limit remains 128K.",
      },
    ],
    specifications: {
      contextTokens: 1000000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      knowledgeCutoff: "Jan 2026",
    },
  },
  "gpt-5-mini": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5-mini",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-3-codex": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.3-codex",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Thinking",
        value:
          "Effort: low, medium, high or xhigh. Designed for agentic coding in Codex and similar environments.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-4": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.4",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and 1.5× output prices for the full session, including Standard, Batch and Flex.",
      },
      {
        label: "Regional processing",
        value: "Data residency endpoints add 10% to the published token rates.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-4-mini": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Regional processing",
        value: "Data residency endpoints add 10% to the published token rates.",
      },
      {
        label: "Thinking",
        value: "Effort: none (default), low, medium, high or xhigh.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-4-nano": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.4-nano",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Regional processing",
        value: "Data residency endpoints add 10% to the published token rates.",
      },
      {
        label: "Thinking",
        value: "Effort: none (default), low, medium, high or xhigh.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.5",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and 1.5× output prices for the full session, including Standard, Batch and Flex.",
      },
      {
        label: "Regional processing",
        value: "Data residency endpoints add 10% to the published token rates.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-6-sol": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and 1.5× output prices for the full request. Cache writes cost 1.25× the uncached input rate.",
      },
      {
        label: "Promotion",
        value:
          "OpenAI states promotional pricing is available at least through November 21, 2026. Prices shown use the accepted current rate; no later price is predicted.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-6-terra": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and 1.5× output prices for the full request. Cache writes cost 1.25× the uncached input rate.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-6-luna": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and 1.5× output prices for the full request. Cache writes cost 1.25× the uncached input rate.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-6-astra": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-6-astra",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Thinking",
        value: "Effort: low, medium, high, xhigh, max.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and cache prices, 1.5× output prices for the full request.",
      },
      {
        label: "Processing options",
        value:
          "Batch and Flex: 50% of Standard token prices. Fast mode: 2× applicable token prices.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-6-sol": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-6-sol",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Thinking",
        value: "Effort: none, low, medium, high, xhigh, max.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and cache prices, 1.5× output prices for the full request.",
      },
      {
        label: "Processing options",
        value:
          "Batch and Flex: 50% of Standard token prices. Fast mode: 2× applicable token prices.",
      },
      {
        label: "Tool compatibility",
        value:
          "Use Responses for reasoning with tools. Chat Completions function calling requires reasoning effort none.",
      },
      {
        label: "Regional processing",
        value:
          "10% premium where available. EU data residency is available with Standard processing only.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-6-luna": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models/gpt-6-luna",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Usage limits",
        value:
          "API request and token limits depend on your account usage tier. They are separate from ChatGPT and Codex subscription allowances.",
      },
      {
        label: "Thinking",
        value: "Effort: none, low, medium, high, xhigh, max.",
      },
      {
        label: "Long prompts",
        value:
          "Above 272K input tokens: 2× input and cache prices, 1.5× output prices for the full request.",
      },
      {
        label: "Processing options",
        value:
          "Batch and Flex: 50% of Standard token prices. Fast mode: 2× applicable token prices.",
      },
      {
        label: "Tool compatibility",
        value:
          "Use Responses for reasoning with tools. Chat Completions function calling requires reasoning effort none.",
      },
      {
        label: "Regional processing",
        value:
          "10% premium where available. EU data residency is available with Standard processing only.",
      },
    ],
    omitSpecifications: ["maxInputTokens"],
  },
  "gpt-5-6-sol-pro": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Identity",
        value:
          "ChatGPT product label. The reviewed API catalog does not establish an exact standalone API model and price for this label.",
      },
      {
        label: "Comparison boundary",
        value:
          "API specifications from similarly named releases are not substituted. Product limits and access depend on the selected subscription.",
      },
    ],
  },
  "gpt-5-thinking-mini": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developers.openai.com/api/docs/models",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Identity",
        value:
          "ChatGPT product label. The reviewed API catalog does not establish an exact standalone API model and price for this label.",
      },
      {
        label: "Comparison boundary",
        value:
          "API specifications from similarly named releases are not substituted. Product limits and access depend on the selected subscription.",
      },
    ],
  },
  "gemini-3-1-pro": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Preview API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-5-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Stable API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-6-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Stable API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-7-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Stable API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
      {
        label: "Thinking",
        value: "Low, medium and high are supported. Minimal is not supported and returns an error.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-8-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Stable API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
      {
        label: "Thinking",
        value: "Low, medium and high are supported. Minimal is not supported and returns an error.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Preview API release.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
      {
        label: "Built-in capabilities",
        value:
          "Caching, code execution, function calling, search grounding and structured output. Built-in tool and cache storage charges are separate from base token rates.",
      },
      {
        label: "Processing options",
        value: "Batch, Flex and Priority inference are supported.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-pro": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-preview",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value: "Retired API preview. Subscription labels are documented separately.",
      },
      {
        label: "Input limit",
        value:
          "The provider publishes a maximum input token count, not a combined input/output context budget.",
      },
      {
        label: "Multimodal input",
        value:
          "Text, images, audio, video and PDF input; text output. Audio and image generation are separate models.",
      },
    ],
    specifications: {
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      inputModalities: ["text", "image", "video", "audio", "pdf"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    },
    omitSpecifications: ["contextTokens"],
  },
  "gemini-3-flash-lite": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Identity",
        value:
          "This is a subscription model label. The current API catalog lists versioned Flash-Lite releases, but does not establish this exact label as a standalone API identifier.",
      },
      {
        label: "Comparison boundary",
        value:
          "A different Flash-Lite release is not silently substituted for pricing or technical limits.",
      },
    ],
  },
  "nano-banana-pro": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API identity",
        value: "gemini-3-pro-image · stable image-generation model.",
      },
      {
        label: "Image generation",
        value:
          "Accepts text and images; produces text and images. Search grounding and thinking are supported.",
      },
      {
        label: "Tool limits",
        value:
          "Function calling, structured output, context caching, code execution and Live API are not supported.",
      },
      {
        label: "Processing options",
        value: "Batch is supported. Flex and Priority inference are not supported.",
      },
    ],
    specifications: {
      toolCalling: false,
      structuredOutput: false,
      maxInputTokens: 65536,
      maxOutputTokens: 32768,
    },
    omitSpecifications: ["contextTokens"],
  },
  "deepseek-v4-1-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://api-docs.deepseek.com/quick_start/pricing/",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Thinking is enabled by default; non-thinking mode is also supported.",
      },
      {
        label: "Time-based pricing",
        value:
          "Peak: 01:00–04:00 and 06:00–10:00 UTC on weekdays, excluding Chinese public holidays. Other hours, weekends and those holidays use half-price off-peak rates.",
      },
      {
        label: "API compatibility",
        value:
          "OpenAI-compatible and Anthropic-compatible endpoints, Responses API, tool calls and JSON output.",
      },
      {
        label: "Vision",
        value: "Image input is supported.",
      },
    ],
  },
  "deepseek-v4-pro": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://api-docs.deepseek.com/quick_start/pricing/",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Thinking is enabled by default; non-thinking mode is also supported.",
      },
      {
        label: "Time-based pricing",
        value:
          "Peak: 01:00–04:00 and 06:00–10:00 UTC on weekdays, excluding Chinese public holidays. Other hours, weekends and those holidays use half-price off-peak rates.",
      },
      {
        label: "API compatibility",
        value:
          "OpenAI-compatible and Anthropic-compatible endpoints, Responses API, tool calls and JSON output.",
      },
      {
        label: "Vision",
        value: "Image input is not supported. This release is text-only.",
      },
    ],
  },
  "deepseek-v4-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://api-docs.deepseek.com/quick_start/pricing/",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value:
          "The original model is retired. The provider still accepts this legacy name but serves DeepSeek-V4.1-Flash instead.",
      },
      {
        label: "Exact-model comparison",
        value:
          "A redirected request is not the original recorded model. Replacement prices and specifications are not treated as an exact replay of this release.",
      },
    ],
  },
  "deepseek-v4-flash-vision-exp": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://api-docs.deepseek.com/quick_start/pricing/",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "API availability",
        value:
          "The original model is retired. The provider still accepts this legacy name but serves DeepSeek-V4.1-Flash instead.",
      },
      {
        label: "Exact-model comparison",
        value:
          "A redirected request is not the original recorded model. Replacement prices and specifications are not treated as an exact replay of this release.",
      },
    ],
  },
  "glm-5-3": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.z.ai/guides/llm/glm-5.3",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value:
          "Reasoning is always enabled and cannot be disabled. Effort supports low, high and max; max is the default.",
      },
      {
        label: "Input support",
        value: "Text input only.",
      },
      {
        label: "API capabilities",
        value: "Tool calling, streaming, context caching and structured output are supported.",
      },
      {
        label: "Access and billing",
        value:
          "The general API and GLM Coding Plan use separate endpoints and billing. A subscription allowance is not an API token balance.",
      },
    ],
  },
  "glm-5-3-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.z.ai/guides/vlm/glm-5.3-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value:
          "Reasoning is always enabled and cannot be disabled. Provider recommends max effort.",
      },
      {
        label: "Input support",
        value: "Video, images, text and file input; text output.",
      },
      {
        label: "API capabilities",
        value: "Tool calling, streaming, context caching and structured output are supported.",
      },
      {
        label: "Access and billing",
        value:
          "The general API and GLM Coding Plan use separate endpoints and billing. A subscription allowance is not an API token balance.",
      },
    ],
  },
  "glm-5-3-flashx": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.z.ai/guides/vlm/glm-5.3-flash",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value:
          "Reasoning is always enabled and cannot be disabled. Provider recommends max effort.",
      },
      {
        label: "Input support",
        value: "Video, images, text and file input; text output.",
      },
      {
        label: "API capabilities",
        value: "Tool calling, streaming, context caching and structured output are supported.",
      },
      {
        label: "Access and billing",
        value:
          "The general API and GLM Coding Plan use separate endpoints and billing. A subscription allowance is not an API token balance.",
      },
    ],
  },
  "grok-4-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.x.ai/developers/models/grok-4.5",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Low, medium, high and xhigh effort; high is the default.",
      },
      {
        label: "Long prompts",
        value:
          "Higher token rates apply around the 200K input threshold. The model page says above 200K; the pricing table says at least 200K.",
      },
      {
        label: "Batch",
        value: "The exact model page lists Batch API as not supported.",
      },
      {
        label: "Tools and regions",
        value:
          "Function calling and structured output are supported. Server-side tools and regional processing can add charges.",
      },
      {
        label: "Output limit",
        value: "No separate maximum output token count is stated on the reviewed model page.",
      },
    ],
  },
  "grok-4-6": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.x.ai/developers/models/grok-4.6",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Low, medium, high and xhigh effort; high is the default.",
      },
      {
        label: "Long prompts",
        value:
          "Higher token rates apply around the 200K input threshold. The model page says above 200K; the pricing table says at least 200K.",
      },
      {
        label: "Batch",
        value: "The exact model page lists Batch API as not supported.",
      },
      {
        label: "Tools and regions",
        value:
          "Function calling and structured output are supported. Server-side tools and regional processing can add charges.",
      },
      {
        label: "Output limit",
        value: "No separate maximum output token count is stated on the reviewed model page.",
      },
    ],
  },
  "grok-4-7": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://docs.x.ai/developers/models/grok-4.7",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Low, medium, high and xhigh effort; high is the default.",
      },
      {
        label: "Long prompts",
        value:
          "Higher token rates apply around the 200K input threshold. The model page says above 200K; the pricing table says at least 200K.",
      },
      {
        label: "Batch",
        value: "The exact model page lists Batch API as not supported.",
      },
      {
        label: "Tools and regions",
        value:
          "Function calling and structured output are supported. Server-side tools and regional processing can add charges.",
      },
      {
        label: "Output limit",
        value: "No separate maximum output token count is stated on the reviewed model page.",
      },
    ],
  },
  "kimi-k3": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Always enabled. Effort: low, high or max; max is the default.",
      },
      {
        label: "Output control",
        value:
          "max_completion_tokens defaults to 131,072 and can be set up to 1,048,576. This parameter ceiling does not add to the 1M context budget.",
      },
      {
        label: "Access",
        value:
          "Requires a successful top-up of at least $1. Cumulative top-ups determine API rate limits.",
      },
      {
        label: "Prompt caching",
        value:
          "Automatic prefix caching with 5-minute or 1-hour TTL. Partial cache blocks are billed as misses. Cache writes are charged separately.",
      },
      {
        label: "Tools",
        value:
          "Strict JSON Schema and tool calling are supported. Provider warns web search is being updated and is not recommended for production yet.",
      },
    ],
    specifications: {
      maxOutputTokens: 1048576,
      structuredOutput: true,
      inputModalities: ["text", "image", "video"],
    },
  },
  "kimi-k2-7-code": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Thinking",
        value: "Thinking is always enabled; non-thinking mode is not supported.",
      },
      {
        label: "Variants",
        value:
          "The high-speed variant is the same model with a distinct API ID and pricing. Standard and high-speed prices are not interchanged.",
      },
      {
        label: "Output limit",
        value: "A separate maximum output ceiling is not stated in the reviewed quickstart.",
      },
      {
        label: "API identity",
        value: "kimi-k2.7-code; OpenAI-compatible API. Text, image and video input.",
      },
    ],
    specifications: {
      inputModalities: ["text", "image", "video"],
    },
  },
  "composer-2-5": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://cursor.com/docs/models/cursor-composer-2-5",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Product access",
        value:
          "Cursor agent model. A separately callable direct API route is not established here.",
      },
      {
        label: "Standard and Fast",
        value:
          "Fast is the default in Cursor. Standard: $0.50 input, $0.20 cache read, $2.50 output per 1M tokens. Fast: $3 input, $0.50 cache read, $15 output.",
      },
      {
        label: "Billing pool",
        value:
          "Draws from the Cursor Models pool with Grok 4.5, 4.6 and 4.7 on individual and team plans. On-demand usage follows the published product rates.",
      },
      {
        label: "Output limit",
        value: "A separate maximum output ceiling is not stated on the reviewed model page.",
      },
    ],
    specifications: {
      reasoning: true,
    },
  },
  "muse-spark-1-3": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://developer.meta.com/ai/models/muse-spark/",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Data choice",
        value:
          "The standard muse-spark-1.3 endpoint is not used to improve Meta products. The cheaper contributor endpoint permits that use and is a separate choice.",
      },
      {
        label: "Capabilities",
        value: "Native image, video and document understanding, reasoning and agentic tool use.",
      },
      {
        label: "Output limit",
        value:
          "The reviewed model page publishes a 1M context window but no separate output ceiling.",
      },
    ],
    specifications: {
      inputModalities: ["text", "image", "video"],
    },
  },
  "mai-code-1-1-flash": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://github.com/microsoft/MAI-Code",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Product access",
        value:
          "Available through GitHub Copilot. Exact direct API pricing and token limits are not published in the reviewed release repository.",
      },
      {
        label: "Capabilities",
        value:
          "Coding model with image understanding. Supported tools and access depend on the Copilot surface and organization policies.",
      },
    ],
  },
  "claude-opus-4-8-fast-mode": {
    checkedAt: "2026-09-29",
    sources: [
      {
        url: "https://platform.claude.com/docs/en/about-claude/pricing",
        title: "Official specifications and conditions",
        checkedAt: "2026-09-29",
      },
    ],
    facts: [
      {
        label: "Processing mode",
        value:
          "Fast mode changes processing speed and prices for Opus 4.8. It is not a distinct base model.",
      },
      {
        label: "Billing",
        value:
          "Fast-mode token prices are separate from standard Opus 4.8. Do not apply a standard-mode rate to a fast-mode request.",
      },
    ],
  },
};
