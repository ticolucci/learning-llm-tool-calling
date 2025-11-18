# AI SDK v5 Reference Guide

**Version**: AI SDK v5.0.93
**Current Provider**: @ai-sdk/groq (Groq - llama-3.3-70b-versatile)
**Alternative Providers**: @ai-sdk/openai v2.0.67, @ai-sdk/anthropic
**Last Updated**: 2025-11-18

This comprehensive reference covers the Vercel AI SDK v5 for building LLM applications with tool calling, streaming, and agentic behavior.

> **Note**: This project currently uses Groq as the LLM provider. The examples below show OpenAI for reference, but the same patterns apply to all AI SDK providers.

## Table of Contents

- [Quick Start](#quick-start)
- [streamText Function](#streamtext-function)
- [Tool Calling](#tool-calling)
- [Response Methods](#response-methods)
- [Configuration Options](#configuration-options)
- [Lifecycle Callbacks](#lifecycle-callbacks)
- [Frontend Integration](#frontend-integration)
- [Common Mistakes](#common-mistakes)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

---

## Quick Start

### Installation

```bash
npm install ai @ai-sdk/openai zod
```

### Basic Example

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toTextStreamResponse();
}
```

### With Tool Calling

```typescript
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      weather: tool({
        description: 'Get weather forecast',
        inputSchema: z.object({
          location: z.string().describe('City name'),
        }),
        execute: async ({ location }) => {
          return { temp: 72, conditions: 'Sunny' };
        },
      }),
    },
  });

  // IMPORTANT: Must use toUIMessageStreamResponse() for tool calling!
  return result.toUIMessageStreamResponse();
}
```

---

## streamText Function

### Function Signature

```typescript
function streamText(options: StreamTextOptions): StreamTextResult
```

### StreamTextOptions

```typescript
interface StreamTextOptions {
  // Required
  model: LanguageModel;
  messages?: Array<CoreMessage>;
  prompt?: string;

  // Optional - Content Generation
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;

  // Optional - Tool Calling
  tools?: Record<string, Tool>;
  toolChoice?: ToolChoice;
  maxSteps?: number;

  // Optional - Lifecycle Callbacks
  onStepFinish?: (step: StepResult) => void | Promise<void>;
  onFinish?: (result: FinalResult) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onChunk?: (chunk: StreamChunk) => void | Promise<void>;

  // Optional - Advanced
  abortSignal?: AbortSignal;
  headers?: Record<string, string>;
  experimental_telemetry?: TelemetrySettings;
}
```

### StreamTextResult

```typescript
interface StreamTextResult {
  // Stream conversion methods
  toTextStreamResponse(): Response;
  toUIMessageStreamResponse(): Response;
  toDataStreamResponse(): Response; // v5.0+

  // Direct stream access
  textStream: ReadableStream<string>;
  fullStream: ReadableStream<FullStreamPart>;

  // Promise-based access
  text: Promise<string>;
  toolCalls: Promise<ToolCall[]>;
  toolResults: Promise<ToolResult[]>;
  usage: Promise<TokenUsage>;
  finishReason: Promise<FinishReason>;
}
```

---

## Tool Calling

### Tool Definition

Tools are defined using the `tool()` helper function with Zod schemas for type safety.

#### Basic Tool

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Fetches weather forecast for a location',
  inputSchema: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['metric', 'imperial']).optional().default('metric'),
  }),
  execute: async ({ location, units }) => {
    // Tool implementation
    const response = await fetch(`https://api.weather.com/${location}?units=${units}`);
    return response.json();
  },
});
```

#### Tool with Context

The second parameter to `execute` provides context:

```typescript
const advancedTool = tool({
  description: 'Tool with advanced features',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }, context) => {
    // context.toolCallId - Unique ID for this invocation
    // context.messages - Conversation history (for agentic behavior)
    // context.abortSignal - For cancellation support

    const response = await fetch(`https://api.example.com?q=${query}`, {
      signal: context.abortSignal, // Enable cancellation
    });

    return response.json();
  },
});
```

#### Tool Without Execute (Client-Side Execution)

You can define tools without the `execute` function for client-side tool calling:

```typescript
const clientTool = tool({
  description: 'Tool executed on client',
  inputSchema: z.object({
    action: z.string(),
  }),
  // No execute - frontend handles tool execution
});
```

### Tool Choice Options

Controls when and how the LLM uses tools.

```typescript
// Auto - Let LLM decide when to use tools (RECOMMENDED)
toolChoice: 'auto'

// Required - Force LLM to use at least one tool
toolChoice: 'required'

// None - Disable all tool calling
toolChoice: 'none'

// Specific tool - Force a specific tool (testing only)
toolChoice: { type: 'tool', toolName: 'weather' }
```

**Best Practices:**

- Use `'auto'` for natural conversations
- Use `'required'` for workflows that MUST use a tool
- Use `'none'` to temporarily disable tools
- Use specific tool forcing ONLY for testing/debugging

### Multi-Step Tool Calling

AI SDK v5 replaced `maxToolRoundtrips` with `maxSteps` for cleaner multi-step tool calling.

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    weather: weatherTool,
    news: newsTool,
  },
  maxSteps: 5, // Allow up to 5 tool invocation iterations
});
```

**How it works:**

1. LLM generates response and may invoke tools
2. Tools execute and results are added to context
3. LLM generates new response with tool results
4. Process repeats up to `maxSteps` times
5. Final response generated

**Example flow:**

```
Step 1: LLM invokes weather("Paris")
Step 2: Weather returns {temp: 72, rain: false}
Step 3: LLM invokes news("Paris events")
Step 4: News returns [...]
Step 5: LLM generates final response: "Paris will be 72°F with these events..."
```

### Alternative: stopWhen Condition

For more complex stopping logic:

```typescript
import { generateText, stepCountIs } from 'ai';

const result = generateText({
  model: openai('gpt-4o'),
  prompt: 'Compare weather in 5 cities',
  tools: { weather: weatherTool },
  stopWhen: stepCountIs(10), // Custom stopping condition
});
```

### Dynamic Tools

For tools with runtime-defined schemas:

```typescript
import { dynamicTool } from 'ai';

const unknownTool = dynamicTool({
  description: 'Tool with dynamic schema',
  execute: async (unknownInput, context) => {
    // Validate input manually since no static schema
    if (typeof unknownInput !== 'object') {
      throw new Error('Invalid input');
    }
    return { result: 'success' };
  },
});
```

---

## Response Methods

AI SDK v5 provides three methods to convert stream results to HTTP responses:

### toTextStreamResponse()

**Use case**: Simple text-only streaming (NO tool calling)

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
});

return result.toTextStreamResponse();
```

**Returns**: `Response` with `text/plain; charset=utf-8` content type
**Streams**: Plain text chunks only
**Tool Support**: ❌ NO - tool calls will NOT work

### toUIMessageStreamResponse()

**Use case**: Streaming with tool calling support (RECOMMENDED for tools)

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: { weather: weatherTool },
});

// REQUIRED for tool calling!
return result.toUIMessageStreamResponse();
```

**Returns**: `Response` with `application/json` content type
**Streams**: UI message parts including:
- Text parts
- Tool call parts
- Tool result parts
- Error parts

**Tool Support**: ✅ YES - full tool calling support
**Frontend**: Compatible with `@ai-sdk/react` `useChat` hook

**Message Part Types:**

```typescript
type MessagePart =
  | { type: 'text', text: string }
  | { type: 'tool-call', toolCallId: string, toolName: string, args: unknown }
  | { type: 'tool-result', toolCallId: string, toolName: string, result: unknown }
  | { type: 'tool-error', toolCallId: string, toolName: string, error: string };
```

### toDataStreamResponse()

**Use case**: Custom streaming with data attachments (v5.0+)

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
});

return result.toDataStreamResponse({
  data: customData, // Attach custom data to stream
});
```

**Returns**: `Response` with data stream format
**Streams**: Text + custom data payloads
**Tool Support**: ✅ YES

---

## Configuration Options

### Model Selection

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// OpenAI models
model: openai('gpt-4o')          // Best for tool calling
model: openai('gpt-4-turbo')     // Fast, good for tools
model: openai('gpt-3.5-turbo')   // Economical

// Anthropic models
model: anthropic('claude-3-5-sonnet-20241022')
model: anthropic('claude-3-opus-20240229')
```

### System Prompt

```typescript
system: 'You are a helpful travel planning assistant. When users ask about weather, use the weather tool. Be concise and friendly.'
```

**Best practices:**
- Be specific about when to use tools
- Guide the LLM's behavior and tone
- Include formatting instructions if needed

### Token Limits

```typescript
// v5: renamed from maxTokens
maxOutputTokens: 500
```

**Important**: Some models (like reasoning models) may not support token limits or temperature.

### Temperature and Sampling

```typescript
temperature: 0.7,        // 0.0 = deterministic, 2.0 = very creative
topP: 0.9,              // Nucleus sampling
topK: 40,               // Top-K sampling
presencePenalty: 0.5,   // Penalize repeated topics
frequencyPenalty: 0.5,  // Penalize repeated tokens
```

### Stop Sequences

```typescript
stopSequences: ['\n\n', 'END']
```

### Seed (for reproducibility)

```typescript
seed: 42 // Same seed + same input = same output (mostly)
```

---

## Lifecycle Callbacks

### onStepFinish

Called after each tool invocation step completes.

```typescript
onStepFinish: (step) => {
  console.log('Step completed:', {
    text: step.text,
    toolCalls: step.toolCalls,
    toolResults: step.toolResults,
    finishReason: step.finishReason,
    usage: step.usage,
  });

  // Access request sent to LLM
  if (step.request?.body) {
    console.log('Request:', step.request.body);
  }

  // Check for tool errors
  if (step.toolResults) {
    step.toolResults.forEach((result) => {
      if ('error' in result) {
        console.error('Tool failed:', result.error);
      }
    });
  }
}
```

**StepResult type:**

```typescript
interface StepResult {
  text: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  finishReason: FinishReason;
  usage: TokenUsage;
  request?: {
    body: unknown;
  };
}
```

### onFinish

Called after all steps complete.

```typescript
onFinish: (result) => {
  console.log('All steps completed:', {
    text: result.text,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    usage: result.usage,
    finishReason: result.finishReason,
  });
}
```

### onError

Called when an error occurs in the stream.

**IMPORTANT**: In `streamText`, errors become part of the stream and are NOT thrown (unlike `generateText`).

```typescript
onError: (error) => {
  console.error('Stream error:', error);

  // Log to error tracking service
  trackError(error);
}
```

**Best practices:**
- ALWAYS provide onError callback
- Log errors to monitoring service
- Consider retry logic for transient failures

### onChunk

Called for each chunk in the stream (advanced usage).

```typescript
onChunk: (chunk) => {
  // chunk.type can be 'text-delta', 'tool-call', etc.
  console.log('Chunk received:', chunk);
}
```

---

## Frontend Integration

### Using @ai-sdk/react v2.0

The `useChat` hook manages streaming and tool calling automatically.

```typescript
'use client';

import { useChat, type UIMessage } from '@ai-sdk/react';

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    api: '/api/chat', // Your API route
    onFinish: ({ message }) => {
      console.log('Message complete:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: userInput });
  };

  return (
    <div>
      {messages.map((msg) => (
        <MessageDisplay key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

### Displaying Messages with Tool Calls

```typescript
function MessageDisplay({ message }: { message: UIMessage }) {
  // Extract text parts
  const textParts = message.parts.filter((p) => p.type === 'text');

  // Extract tool calls
  const toolCalls = message.parts.filter((p) => p.type === 'tool-call');

  // Extract tool results
  const toolResults = message.parts.filter((p) => p.type === 'tool-result');

  return (
    <div>
      {/* Display text */}
      {textParts.map((part, i) => (
        <p key={i}>{'text' in part ? part.text : ''}</p>
      ))}

      {/* Display tool invocations */}
      {toolCalls.map((tc, i) => (
        <div key={i} className="tool-indicator">
          🔧 Calling {tc.toolName}({JSON.stringify(tc.args)})
        </div>
      ))}

      {/* Display tool results */}
      {toolResults.map((tr, i) => (
        <div key={i} className="tool-result">
          ✅ Result: {JSON.stringify(tr.result)}
        </div>
      ))}
    </div>
  );
}
```

### Handling Loading States

```typescript
const { status } = useChat();

const isLoading = status === 'submitted' || status === 'streaming';

// Possible status values:
// - 'idle': No active request
// - 'submitted': Request sent, waiting for response
// - 'streaming': Receiving stream chunks
// - 'error': Error occurred
```

---

## Common Mistakes

### 1. Using Wrong Response Method for Tools

❌ **WRONG** - Will break tool calling:
```typescript
const result = streamText({
  tools: { weather: weatherTool },
  // ...
});

return result.toTextStreamResponse(); // ❌ NO tool support!
```

✅ **CORRECT**:
```typescript
const result = streamText({
  tools: { weather: weatherTool },
  // ...
});

return result.toUIMessageStreamResponse(); // ✅ Tool support!
```

### 2. Using v3/v4 Parameter Names in v5

❌ **WRONG**:
```typescript
tool({
  parameters: z.object({ /* ... */ }), // v3 syntax
})
```

✅ **CORRECT**:
```typescript
tool({
  inputSchema: z.object({ /* ... */ }), // v5 syntax
})
```

### 3. Forcing Tool Choice in Production

❌ **WRONG** - Forces tool on every request:
```typescript
toolChoice: { type: 'tool', toolName: 'weather' }
```

✅ **CORRECT** - Let LLM decide:
```typescript
toolChoice: 'auto'
```

### 4. Forgetting Tool Descriptions

❌ **WRONG** - Vague description:
```typescript
description: 'Gets weather'
```

✅ **CORRECT** - Clear and specific:
```typescript
description: 'Fetches weather forecast for a location and date range. Use this when users ask about weather conditions, temperature, or trip planning.'
```

### 5. Using maxTokens Instead of maxOutputTokens

❌ **WRONG** (v3 syntax):
```typescript
maxTokens: 500
```

✅ **CORRECT** (v5 syntax):
```typescript
maxOutputTokens: 500
```

### 6. Not Handling Tool Errors

❌ **WRONG**:
```typescript
execute: async ({ location }) => {
  const data = await fetch(url); // May throw!
  return data.json();
}
```

✅ **CORRECT**:
```typescript
execute: async ({ location }) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    // Error will appear in stream as tool-error
    throw new Error(`Weather fetch failed: ${error.message}`);
  }
}
```

### 7. Using JSON Schema Instead of Zod

❌ **WORKS but not recommended**:
```typescript
import { jsonSchema } from 'ai';

inputSchema: jsonSchema({
  type: 'object',
  properties: {
    location: { type: 'string' }
  }
})
```

✅ **RECOMMENDED** - Better TypeScript inference:
```typescript
inputSchema: z.object({
  location: z.string().describe('City name'),
})
```

### 8. Not Providing Abort Signal to Async Operations

❌ **WRONG** - Can't cancel:
```typescript
execute: async ({ query }) => {
  return await fetch(url); // Can't cancel if user navigates away
}
```

✅ **CORRECT** - Cancellable:
```typescript
execute: async ({ query }, { abortSignal }) => {
  return await fetch(url, { signal: abortSignal });
}
```

---

## Migration Guide

### Migrating from v3/v4 to v5

#### Automatic Migration

Run the official codemod:

```bash
npx @ai-sdk/codemod upgrade
```

#### Manual Changes

**1. Tool definition:**

```typescript
// v3/v4
tool({
  parameters: z.object({ /* ... */ }),
})

// v5
tool({
  inputSchema: z.object({ /* ... */ }),
})
```

**2. Token limits:**

```typescript
// v3/v4
maxTokens: 500

// v5
maxOutputTokens: 500
```

**3. Multi-step tool calling:**

```typescript
// v3/v4
maxToolRoundtrips: 3

// v5
maxSteps: 4 // Note: steps = roundtrips + 1
```

**4. Response methods:**

```typescript
// v3/v4
result.toDataStreamResponse()

// v5
result.toUIMessageStreamResponse() // For tool calling
result.toTextStreamResponse()      // For text only
result.toDataStreamResponse()      // Still available
```

**5. Message format:**

Frontend message structure changed in `@ai-sdk/react@2.0`:

```typescript
// v1.x
message.content // Simple string

// v2.0
message.parts // Array of MessagePart
```

---

## Examples

### Example 1: Weather Tool with Natural Conversation

```typescript
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    system: 'You are a helpful assistant. Use the weather tool when users ask about weather.',

    tools: {
      get_weather: tool({
        description: 'Get weather forecast for a location. Use when users ask about weather conditions.',
        inputSchema: z.object({
          location: z.string().describe('City name'),
        }),
        execute: async ({ location }) => {
          const response = await fetch(`https://api.weather.com/${location}`);
          return response.json();
        },
      }),
    },

    toolChoice: 'auto', // Let LLM decide

    onStepFinish: (step) => {
      console.log('Step:', step.toolCalls?.length || 0, 'tool calls');
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Example 2: Multi-Step Tool Calling

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: 'Compare weather in Paris, London, and Berlin' }
  ],

  tools: {
    weather: tool({
      description: 'Get weather for a city',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        // ... fetch weather
        return { city, temp: 72, conditions: 'Sunny' };
      },
    }),
  },

  maxSteps: 5, // Allow multiple tool calls

  onStepFinish: (step) => {
    if (step.toolCalls) {
      console.log('Tools called:', step.toolCalls.map(tc => tc.toolName));
    }
  },
});

// Flow:
// Step 1: LLM calls weather("Paris")
// Step 2: LLM calls weather("London")
// Step 3: LLM calls weather("Berlin")
// Step 4: LLM generates comparison response
```

### Example 3: Error Handling

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,

  tools: {
    risky_tool: tool({
      description: 'A tool that might fail',
      inputSchema: z.object({
        param: z.string(),
      }),
      execute: async ({ param }) => {
        try {
          const response = await fetch(`https://api.example.com/${param}`);
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return await response.json();
        } catch (error) {
          // Error will appear as tool-error in stream
          throw new Error(`Tool failed: ${error.message}`);
        }
      },
    }),
  },

  onStepFinish: (step) => {
    // Check for tool errors
    if (step.toolResults) {
      step.toolResults.forEach((result) => {
        if ('error' in result) {
          console.error('Tool execution failed:', result.error);
          // LLM will see the error and can retry or explain to user
        }
      });
    }
  },

  onError: (error) => {
    // Stream-level errors (network, auth, etc.)
    console.error('Stream error:', error);
  },
});
```

### Example 4: Cancellation Support

```typescript
// API route with timeout
export const maxDuration = 30; // Vercel timeout

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Create abort controller
  const abortController = new AbortController();

  // Cancel after 25 seconds (before Vercel timeout)
  const timeout = setTimeout(() => {
    abortController.abort();
  }, 25000);

  try {
    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      abortSignal: abortController.signal, // Pass abort signal

      tools: {
        slow_tool: tool({
          description: 'Tool with cancellation support',
          inputSchema: z.object({
            query: z.string(),
          }),
          execute: async ({ query }, { abortSignal }) => {
            // Pass signal to fetch
            const response = await fetch(`https://slow-api.com/${query}`, {
              signal: abortSignal,
            });
            return response.json();
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } finally {
    clearTimeout(timeout);
  }
}
```

### Example 5: Agentic Behavior with Message History

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,

  tools: {
    memory_tool: tool({
      description: 'Tool that uses conversation history',
      inputSchema: z.object({
        key: z.string(),
      }),
      execute: async ({ key }, { messages }) => {
        // Access full conversation history
        console.log('Previous messages:', messages.length);

        // Use history for context-aware behavior
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];

        return {
          key,
          context: lastUserMessage?.content,
        };
      },
    }),
  },

  maxSteps: 5,
});
```

---

## Best Practices

### 1. Tool Descriptions

Be specific about:
- What the tool does
- When to use it
- What parameters mean

```typescript
// ❌ BAD
description: 'Gets data'

// ✅ GOOD
description: 'Fetches weather forecast for a specific location and date range. Use when users ask about weather conditions, temperature, precipitation, or trip planning.'
```

### 2. Parameter Descriptions

Use Zod's `.describe()` for better LLM understanding:

```typescript
z.object({
  location: z.string().describe('City name or geographic coordinates in "lat,lon" format'),
  startDate: z.string().describe('Start date in ISO 8601 format (YYYY-MM-DD)'),
  units: z.enum(['metric', 'imperial']).describe('Temperature units: metric for Celsius, imperial for Fahrenheit'),
})
```

### 3. Error Handling

Always handle errors gracefully:

```typescript
execute: async ({ param }, { abortSignal }) => {
  try {
    // Check cancellation before expensive operation
    if (abortSignal?.aborted) {
      throw new Error('Operation cancelled');
    }

    const response = await fetch(url, { signal: abortSignal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Provide helpful error message to LLM
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}
```

### 4. Monitoring and Logging

Use lifecycle callbacks for observability:

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: { /* ... */ },

  onStepFinish: (step) => {
    // Log to monitoring service
    analytics.track('llm_step_complete', {
      toolCalls: step.toolCalls?.length || 0,
      tokensUsed: step.usage.totalTokens,
      finishReason: step.finishReason,
    });
  },

  onFinish: (result) => {
    // Log final metrics
    analytics.track('llm_request_complete', {
      totalSteps: result.toolCalls?.length || 0,
      totalTokens: result.usage.totalTokens,
      cost: calculateCost(result.usage),
    });
  },

  onError: (error) => {
    // Send to error tracking
    errorTracker.captureException(error, {
      context: 'llm_streaming',
      model: 'gpt-4o',
    });
  },
});
```

### 5. Deployment Timeouts

Set appropriate timeouts for your deployment platform:

```typescript
// For Vercel
export const maxDuration = 60; // 60 seconds

// Recommendations:
// - Simple chatbots: 30 seconds
// - With tools: 60-120 seconds
// - Complex agents: 180-900 seconds (Pro plan)
```

### 6. Testing Strategy

- **Unit tests**: Mock tool execution with Vitest
- **Integration tests**: Test real API calls with small models
- **Manual tests**: Interactive testing in development

```typescript
// Integration test example
import { describe, it, expect } from 'vitest';
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

describe('Tool Calling Integration', () => {
  it('should invoke tool when relevant', async () => {
    const result = streamText({
      model: openai('gpt-4o'),
      messages: [
        { role: 'user', content: 'What is the weather in Paris?' }
      ],
      tools: {
        weather: tool({
          description: 'Get weather',
          inputSchema: z.object({
            location: z.string(),
          }),
          execute: async ({ location }) => {
            return { temp: 72, conditions: 'Sunny' };
          },
        }),
      },
    });

    const { toolCalls } = await result;

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].toolName).toBe('weather');
    expect(toolCalls[0].args).toMatchObject({ location: expect.stringContaining('Paris') });
  });
});
```

---

## Official Resources

- **Documentation**: https://ai-sdk.dev/docs
- **API Reference**: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- **Tool Calling Guide**: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- **Migration Guide**: https://ai-sdk.dev/docs/migration-guides/migration-guide-4-0
- **Examples**: https://ai-sdk.dev/examples
- **GitHub**: https://github.com/vercel/ai
- **Discord**: https://discord.gg/DerbCDp

---

## Quick Reference Card

```typescript
// Minimal setup
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = streamText({
  model: openai('gpt-4o'),
  messages: [...],
  system: 'You are...',
  maxOutputTokens: 500,

  tools: {
    tool_name: tool({
      description: 'Clear description',
      inputSchema: z.object({
        param: z.string().describe('Param description'),
      }),
      execute: async ({ param }, { abortSignal }) => {
        return { result: 'data' };
      },
    }),
  },

  toolChoice: 'auto',
  maxSteps: 5,

  onStepFinish: (step) => console.log('Step:', step),
  onFinish: (result) => console.log('Done:', result),
  onError: (error) => console.error('Error:', error),
});

// For tool calling: MUST use toUIMessageStreamResponse()
return result.toUIMessageStreamResponse();
```
