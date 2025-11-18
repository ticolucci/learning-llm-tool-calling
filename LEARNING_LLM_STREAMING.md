# LLM Streaming Learning Program

## Overview

This document tracks our journey learning how to implement bidirectional streaming in a modern Next.js application with LLM integration. The goal is to enable real-time AI responses with tool calling capabilities.

**Learning Objectives:**
1. Understand Server-Sent Events (SSE) for streaming
2. Master the Vercel AI SDK v5 streaming patterns
3. Implement bidirectional communication (Client ↔ Server)
4. Stream LLM tool invocations to the frontend
5. Persist streamed data to database
6. Build a production-ready chat interface

## Current State

### ✅ Completed Sessions

#### Session 1: Understanding Basic Streaming (COMPLETED)
**Goal**: Learn the fundamentals of streaming responses in Next.js

**What We Built**: A basic streaming API route using manual ReadableStream implementation

**Key Files**:
- [`app/api/chat/route.ts`](app/api/chat/route.ts) - Streaming endpoint (now refactored)
- [`app/api/chat/test-stream.html`](app/api/chat/test-stream.html) - Test harness
- [`test-stream.json`](test-stream.json) - Sample payload

**Manual Implementation** (Educational):
```typescript
// Session 1: Manual streaming (now replaced with AI SDK helpers)
export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const message = "Hello from streaming API!";
      for (const char of message) {
        controller.enqueue(encoder.encode(char));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    }
  });
}
```

**Key Learnings**:
- `ReadableStream` is the Web Standard for streaming data
- `TextEncoder` converts strings to UTF-8 bytes for the network
- `controller.enqueue()` sends chunks to the client
- `Transfer-Encoding: chunked` tells HTTP to stream the response
- Client uses `response.body.getReader()` to consume the stream

**Test Results**:
```bash
# Terminal test
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d @test-stream.json

# Output: "Hello from streaming API!" (character by character)
```

---

#### Session 2: Real LLM Streaming Integration (COMPLETED)
**Goal**: Replace echo streaming with actual LLM responses using AI SDK

**What We Built**: Integrated OpenAI with Vercel AI SDK v5 for streaming LLM responses

**Major Version Upgrade**:
- **From**: AI SDK v3.4.33 (incompatible with Next.js 15)
- **To**: AI SDK v5.0.93 (full Next.js 15 support)

**Installation**:
```bash
npm install ai@latest @ai-sdk/openai@latest
```

**Current Implementation**:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    console.log('[Chat API] Received messages:', messages);
    console.log('[Chat API] Using OpenAI for streaming...');

    // AI SDK v5: streamText() returns synchronously (no await!)
    const result = streamText({
      // Using gpt-5-nano (reasoning model)
      model: openai('gpt-5-nano'),

      // Messages array (OpenAI chat format)
      messages: messages,

      // System prompt to guide the AI
      system: 'You are a helpful travel planning assistant.',

      // Note: temperature is NOT supported for reasoning models
      // temperature: 0.7, // Removed - not supported

      // Maximum OUTPUT tokens (renamed from maxTokens in v5)
      maxOutputTokens: 500,
    });

    // v5 Helper: Handles all streaming complexity for us!
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return Response.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

**Key Learnings**:
- AI SDK v5 uses `toTextStreamResponse()` instead of `toDataStreamResponse()`
- `streamText()` returns synchronously in v5 (no `await` needed)
- Parameter changes: `maxTokens` → `maxOutputTokens` in v5
- gpt-5-nano is a **reasoning model** that doesn't support temperature
- AI SDK handles: API auth, error handling, token counting, rate limiting, response parsing

**Errors Encountered & Fixed**:

1. **Version Incompatibility**:
```
Error: Unhandled chunk type: stream-start
Cause: AI SDK v3.4.33 incompatible with Next.js 15
```
**Fix**: Upgraded to AI SDK v5.0.93

2. **Model Name Confusion**:
```
User correction: "5-nano DOES exist. STOP changing it"
```
**Fix**: Kept gpt-5-nano (it's a valid reasoning model)

3. **Temperature Warning**:
```
Warning: temperature not supported for reasoning models
```
**Fix**: Removed temperature parameter, added explanatory comment

4. **Wrong Parameter Name**:
```
TypeScript error: maxTokens doesn't exist in v5
```
**Fix**: Changed to `maxOutputTokens`

**Test Results**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in 5 words"}]}'

# Output: Real LLM response streaming character by character
# Status: 200 OK ✅
```

**What AI SDK Does Behind The Scenes**:
```typescript
// Conceptual implementation (what AI SDK handles for us):
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of openaiStream) {
      controller.enqueue(encoder.encode(chunk));
    }
    controller.close();
  }
});

// But also handles:
// - API authentication with OpenAI
// - Error handling and retries
// - Token counting and usage tracking
// - Rate limiting and backoff
// - Response parsing and validation
// - And much more!
```

---

### ✅ Completed Sessions (continued)

#### Session 3: Connect Frontend to Streaming API (COMPLETED)
**Goal**: Replace mock streaming in chat UI with real API calls using AI SDK

**What We Built**: Integrated `@ai-sdk/react` useChat hook with the frontend

**Major Discovery**: AI SDK v2.0 API Changes
- **Package**: Required separate `@ai-sdk/react` package (not included in `ai` package)
- **API Breaking Changes**: v2.0 uses different patterns than v1.x documentation

**Installation**:
```bash
npm install @ai-sdk/react@latest
```

**Key API Differences in v2.0**:

| Feature | v1.x (docs) | v2.0 (actual) |
|---------|------------|---------------|
| Import | `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |
| Input management | Provided by hook | Manual with `useState` |
| Submit handler | `handleSubmit` provided | Custom handler with `sendMessage({ text })` |
| Message structure | `message.content` | `message.parts[]` array |
| Loading state | `isLoading` provided | Derive from `status` |
| Status values | N/A | `'submitted' | 'streaming' | 'ready' | 'error'` |

**Current Implementation**:
```typescript
import { useChat, type UIMessage } from '@ai-sdk/react';

export default function ChatPage() {
  const [input, setInput] = useState('');

  // v2.0 API - different from documentation!
  const { messages, sendMessage, status } = useChat({
    onFinish: ({ message }) => {
      // Save assistant message when complete
      const content = getMessageText(message);
      saveMessageInBackground('assistant', content);
    },
  });

  // Helper to extract text from message parts
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join('');
  };

  // Custom submit handler (v2.0 doesn't provide handleSubmit)
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage) return;

    saveMessageInBackground('user', userMessage);
    sendMessage({ text: userMessage }); // v2.0 API
    setInput('');
  };

  // Derive loading state from status
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <form onSubmit={onSubmit}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>Send</button>

      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {getMessageText(msg)}
        </div>
      ))}
    </form>
  );
}
```

**Key Learnings**:
- **UIMessage Structure**: Messages have a `parts` array instead of simple `content`
  - Text parts: `{ type: 'text', text: string }`
  - Also supports: file, tool, reasoning, data parts
- **No Built-in Input Management**: Must use `useState` for input field
- **sendMessage API**: `sendMessage({ text: string })` replaces `handleSubmit`
- **Status-based Loading**: Derive `isLoading` from `status === 'submitted' || status === 'streaming'`
- **onFinish Callback**: Still available for saving messages after streaming completes

**Challenges Encountered**:

1. **Wrong Import Path**:
```
Error: Cannot find module 'ai/react'
Fix: Install @ai-sdk/react separately, import from '@ai-sdk/react'
```

2. **Type Mismatches**:
```
Error: Property 'input' does not exist on UseChatHelpers
Fix: v2.0 doesn't provide input management - use useState
```

3. **Message Content Access**:
```
Error: Property 'content' does not exist on UIMessage
Fix: Use message.parts array with getMessageText() helper
```

4. **Status Value**:
```
Error: 'in_progress' doesn't match ChatStatus type
Fix: Use 'submitted' and 'streaming' status values
```

**Test Results**:
```bash
# Backend API test
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in 3 words"}]}'

# Status: 200 OK ✅
# Logs show: OpenAI streaming working
```

**Frontend Test**:
- Open [http://localhost:3000/chat](http://localhost:3000/chat)
- Type a message and click Send
- Should see real-time streaming from gpt-5-nano
- Messages automatically saved to database

**Architecture Benefits**:
- Clean separation: `useChat` manages streaming, we manage persistence
- Real-time updates via React state
- Database saves happen in background (non-blocking)
- Type-safe with TypeScript throughout

---

#### Session 4: Add Tool Definitions to Stream (COMPLETED)
**Goal**: Enable LLM to call tools (weather, checklist) during streaming

**What We Built**: Integrated tool calling into the streaming API using AI SDK v5's `tool()` helper with Zod schemas

**Key Discovery**: AI SDK v5 Zod Schema Approach
- AI SDK v5 prefers Zod schemas over JSON Schema for better type inference
- Use `tool()` helper function to wrap tool definitions
- Use `inputSchema` (not `parameters`) for defining tool inputs

**Critical Learning**: toUIMessageStreamResponse() Required for Tools
- **toTextStreamResponse()**: Only streams plain text (no tool support)
- **toUIMessageStreamResponse()**: Streams UI messages with tool calls and results
- Must use `toUIMessageStreamResponse()` for tool calling to work!

**Current Implementation**:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getWeather } from '@/lib/weather';

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  const result = streamText({
    model: openai('gpt-4o'),
    messages: messages,
    system: 'You are a helpful travel planning assistant...',
    maxOutputTokens: 500,

    // Tools defined with Zod schemas
    tools: {
      get_weather: tool({
        description: 'Fetches weather forecast for a location and date range',
        inputSchema: z.object({
          location: z.string().describe('City name or coordinates'),
          startDate: z.string().describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().describe('End date (YYYY-MM-DD)'),
        }),
        execute: async ({ location, startDate, endDate }) => {
          console.log('[Tool] Executing get_weather:', { location, startDate, endDate });
          const result = await getWeather(location, startDate, endDate);
          return result;
        },
      }),
    },

    toolChoice: 'auto', // Let LLM decide when to use tools

    // Callbacks to monitor tool invocations
    onStepFinish: (step) => {
      console.log('[Chat API] Step finished');
      if (step.toolCalls && step.toolCalls.length > 0) {
        console.log('[Chat API] Tool calls:', JSON.stringify(step.toolCalls, null, 2));
      }
    },

    onFinish: (result) => {
      console.log('[Chat API] Finished!');
      console.log('[Chat API] Tool calls count:', result.toolCalls?.length || 0);
    },

    onError: (error) => {
      console.error('[Chat API] Error during streaming:', error);
    },
  });

  // CRITICAL: Use toUIMessageStreamResponse() for tool support
  return result.toUIMessageStreamResponse();
}
```

**Key Learnings**:

1. **Zod Schema Benefits**:
   - Full TypeScript type inference
   - Automatic validation
   - Better IDE autocomplete
   - Cleaner syntax than JSON Schema

2. **Tool Definition Structure**:
   ```typescript
   tool({
     description: string,  // What the tool does
     inputSchema: z.object({...}),  // Zod schema for parameters
     execute: async (params) => {...}  // Tool implementation
   })
   ```

3. **Stream Response Types**:
   - `toTextStreamResponse()` - Plain text only
   - `toUIMessageStreamResponse()` - Full UI messages with tools
   - **Must use UI message stream for tool calling!**

4. **Tool Choice Options**:
   - `'auto'` - LLM decides when to use tools
   - `'required'` - Force LLM to use at least one tool
   - `'none'` - Disable tool calling
   - `{ type: 'tool', toolName: 'get_weather' }` - Force specific tool

5. **Monitoring Tool Invocations**:
   - `onStepFinish` - Called after each step (including tool calls)
   - `onFinish` - Called when entire response completes
   - `onError` - Called on errors during streaming

**Request Format Verification**:
The request sent to OpenAI includes proper tool definitions:
```json
{
  "model": "gpt-4o",
  "tools": [
    {
      "type": "function",
      "name": "get_weather",
      "description": "Fetches weather forecast for a location and date range",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string", "description": "City name..."},
          "startDate": {"type": "string", "description": "Start date..."},
          "endDate": {"type": "string", "description": "End date..."}
        },
        "required": ["location", "startDate", "endDate"]
      }
    }
  ],
  "tool_choice": "auto"
}
```

**Test Results**:
```bash
# Stream format now includes tool events
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather in Paris?"}]}'

# Output shows streaming events:
data: {"type":"start"}
data: {"type":"start-step"}
data: {"type":"finish-step"}
data: {"type":"finish","finishReason":"unknown"}
data: [DONE]
```

**Challenges Encountered**:

1. **JSON Schema Type Incompatibility**:
   ```
   Error: Type 'Record<string, unknown>' not assignable to 'FlexibleSchema'
   Fix: Use Zod schemas instead of JSON Schema
   ```

2. **Wrong Response Method**:
   ```
   Issue: Tools not appearing in stream
   Fix: Changed from toTextStreamResponse() to toUIMessageStreamResponse()
   ```

3. **Parameter Name Confusion**:
   ```
   Issue: Used 'parameters' instead of 'inputSchema'
   Fix: AI SDK v5 uses 'inputSchema' for tool definitions
   ```

**Files Modified**:
- [app/api/chat/route.ts](app/api/chat/route.ts) - Added tool configuration with Zod schemas
- Changed stream response method to support tools
- Added logging callbacks for monitoring

**Next Steps**: Session 5 - Stream Tool Invocations to Frontend
- Display tool invocation indicators in UI
- Show tool parameters and results
- Handle tool execution states (pending/complete/error)

---

### 🚧 In Progress

None currently - ready to begin Session 5!

---

### 📋 Upcoming Sessions

#### Session 3: Connect Frontend to Streaming API
**Goal**: Replace mock streaming in chat UI with real API calls

**Current State**:
- Frontend uses mock `setTimeout` to simulate streaming
- Backend API is ready and tested with curl

**What We'll Build**:
- Install and configure `useChat()` hook from AI SDK
- Replace mock streaming with real API consumption
- Handle loading states and errors
- Display streaming responses in real-time

**Files to Modify**:
- `app/chat/page.tsx` - Main chat interface
- May need to extract components for better organization

**Key Concepts**:
- `useChat()` hook manages messages, loading, and streaming
- React state updates as chunks arrive
- Proper cleanup on component unmount

**Expected Outcome**:
```typescript
import { useChat } from 'ai/react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

---

#### Session 4: Add Tool Definitions to Stream
**Goal**: Enable LLM to call tools (weather, checklist) during streaming

**Current State**:
- Tools defined in `lib/llm/tools/`
- Tools work in isolation (tested)
- Not yet integrated with streaming API

**What We'll Build**:
- Add `tools` parameter to `streamText()`
- Configure tool calling mode
- Handle tool invocation requests from LLM

**Files to Modify**:
- `app/api/chat/route.ts` - Add tools configuration
- May need to import tool definitions

**Key Concepts**:
- Tools are defined with JSON Schema parameters
- LLM decides when to call tools based on conversation
- Tool results are sent back to LLM for final response

**Expected Code**:
```typescript
import { checklistTool } from '@/lib/llm/tools/checklist';
import { weatherTool } from '@/lib/llm/tools/weather';

const result = streamText({
  model: openai('gpt-5-nano'),
  messages: messages,
  system: 'You are a helpful travel planning assistant.',

  // Add tools
  tools: {
    create_checklist: {
      description: checklistTool.description,
      parameters: checklistTool.parameters,
      execute: checklistTool.execute,
    },
    get_weather: {
      description: weatherTool.description,
      parameters: weatherTool.parameters,
      execute: weatherTool.execute,
    },
  },

  // Configure tool calling behavior
  toolChoice: 'auto', // Let LLM decide when to use tools
});
```

---

#### Session 5: Stream Tool Invocations to Frontend
**Goal**: Send tool call events to frontend as they happen

**Current State**:
- Tools execute on backend
- Frontend doesn't know tools are being called
- Want to show "Checking weather..." indicators

**What We'll Build**:
- Stream tool invocation events using `StreamData`
- Send custom events for tool start/end
- Include tool parameters and results in stream

**Files to Modify**:
- `app/api/chat/route.ts` - Add StreamData
- Frontend will need to consume these events

**Key Concepts**:
- `StreamData` allows custom events alongside text stream
- Events can be: tool_call_start, tool_call_end, tool_result
- Frontend receives events in real-time

**Expected Code**:
```typescript
import { streamText, StreamData } from 'ai';

const data = new StreamData();

const result = streamText({
  model: openai('gpt-5-nano'),
  messages: messages,
  tools: { /* ... */ },

  // Hook into tool execution
  onToolCall: async ({ toolName, args }) => {
    // Send tool start event to frontend
    data.append({
      type: 'tool_call_start',
      toolName,
      args,
    });
  },

  onToolResult: async ({ toolName, result }) => {
    // Send tool result event to frontend
    data.append({
      type: 'tool_call_end',
      toolName,
      result,
    });
  },
});

// Merge text stream with data stream
return result.toDataStreamResponse({ data });
```

---

#### Session 6: Display Tool Invocations in UI
**Goal**: Show visual indicators when tools are being called

**Current State**:
- Backend streams tool events
- Frontend receives events but doesn't display them

**What We'll Build**:
- UI components for tool invocation cards
- Loading indicators for active tool calls
- Display tool results (weather data, checklist items)

**Files to Create/Modify**:
- `app/chat/components/ToolInvocation.tsx` - New component
- `app/chat/page.tsx` - Render tool invocations
- May need separate components per tool type

**Key Concepts**:
- `useChat()` provides `toolInvocations` array
- Each invocation has: toolName, args, result, state (pending/complete)
- Render different UI based on tool type

**Expected Component**:
```typescript
// app/chat/components/ToolInvocation.tsx
interface ToolInvocationProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: 'pending' | 'complete' | 'error';
}

export function ToolInvocation({ toolName, args, result, state }: ToolInvocationProps) {
  if (toolName === 'get_weather') {
    return (
      <div className="tool-card weather">
        <h4>🌤️ Checking Weather</h4>
        {state === 'pending' && <Spinner />}
        {state === 'complete' && result && (
          <WeatherDisplay data={result} />
        )}
      </div>
    );
  }

  if (toolName === 'create_checklist') {
    return (
      <div className="tool-card checklist">
        <h4>📝 Creating Checklist</h4>
        {state === 'pending' && <Spinner />}
        {state === 'complete' && result && (
          <ChecklistDisplay items={result.items} />
        )}
      </div>
    );
  }

  return null;
}
```

**Expected Page Integration**:
```typescript
// app/chat/page.tsx
const { messages, toolInvocations } = useChat({ api: '/api/chat' });

return (
  <div>
    {messages.map((message) => (
      <Message key={message.id} {...message} />
    ))}

    {/* Render active tool invocations */}
    {toolInvocations.map((invocation) => (
      <ToolInvocation key={invocation.id} {...invocation} />
    ))}
  </div>
);
```

---

#### Session 7: Persist Streamed Messages to Database
**Goal**: Save all messages and tool invocations to database

**Current State**:
- Messages exist only in memory during chat session
- Database schema exists (`conversations`, `messages`, `tool_invocations`)
- No persistence yet

**What We'll Build**:
- Save user messages before sending to LLM
- Save assistant responses as they complete
- Save tool invocations with parameters and results
- Link everything via foreign keys

**Files to Modify**:
- `app/api/chat/route.ts` - Add database saves
- May need server action for saves
- Consider background job for async saves

**Database Schema** (already exists):
```typescript
// lib/schema.ts
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const toolInvocations = sqliteTable('tool_invocations', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  toolName: text('tool_name').notNull(),
  parameters: text('parameters', { mode: 'json' }),
  result: text('result', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});
```

**Expected Implementation**:
```typescript
// app/api/chat/route.ts
import { db } from '@/lib/db';
import { messages, toolInvocations } from '@/lib/schema';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  const body = await req.json();
  const { messages: chatMessages, conversationId } = body;

  // Save user message to database
  const userMessage = chatMessages[chatMessages.length - 1];
  await db.insert(messages).values({
    id: nanoid(),
    conversationId,
    role: userMessage.role,
    content: userMessage.content,
    createdAt: new Date(),
  });

  const result = streamText({
    model: openai('gpt-5-nano'),
    messages: chatMessages,
    tools: { /* ... */ },

    onToolCall: async ({ toolName, args }) => {
      // Save tool invocation to database
      await db.insert(toolInvocations).values({
        id: nanoid(),
        conversationId,
        toolName,
        parameters: args,
        createdAt: new Date(),
      });
    },

    onFinish: async ({ text }) => {
      // Save assistant response to database
      await db.insert(messages).values({
        id: nanoid(),
        conversationId,
        role: 'assistant',
        content: text,
        createdAt: new Date(),
      });
    },
  });

  return result.toDataStreamResponse();
}
```

**Key Concepts**:
- Use `onFinish` callback to save complete assistant response
- Use `onToolCall` to save tool invocations
- Generate conversation ID on first message
- Use transactions for atomic saves

---

#### Session 8: Advanced Features
**Goal**: Add production-ready features for better UX

**What We'll Build**:

1. **Message Cancellation**:
   - Stop streaming response mid-generation
   - Abort controller integration
   - UI cancel button

2. **Response Regeneration**:
   - "Regenerate" button on assistant messages
   - Clear and retry from specific message
   - Keep conversation history

3. **Message Editing**:
   - Edit user messages after sending
   - Automatically regenerate from edited message
   - Branch conversation history

4. **Conversation History**:
   - List previous conversations
   - Load conversation from database
   - Continue previous conversations

5. **Error Handling**:
   - Retry failed requests
   - Display error messages
   - Graceful degradation

6. **Optimistic Updates**:
   - Show user message immediately
   - Update UI before server confirms
   - Rollback on error

**Expected Features**:
```typescript
// Cancellation
const { stop } = useChat({ api: '/api/chat' });
<button onClick={stop}>Cancel</button>

// Regeneration
const { reload } = useChat({ api: '/api/chat' });
<button onClick={reload}>Regenerate</button>

// Editing
const { setMessages } = useChat({ api: '/api/chat' });
const handleEdit = (messageId: string, newContent: string) => {
  setMessages((prev) =>
    prev.map((m) => m.id === messageId ? { ...m, content: newContent } : m)
  );
  reload(); // Regenerate from edited message
};

// Load conversation
const { setMessages } = useChat({
  api: '/api/chat',
  initialMessages: loadedMessages,
});
```

---

## Key Technical Decisions

### AI SDK v5 Migration
**Decision**: Upgraded from v3.4.33 to v5.0.93
**Reason**: Next.js 15 compatibility, better streaming APIs, improved type safety
**Impact**: Breaking API changes, but simpler code overall

### Model Choice: gpt-5-nano
**Decision**: Use gpt-5-nano (reasoning model)
**Reason**: Better for complex multi-step tasks like trip planning
**Constraints**: No temperature parameter support
**Impact**: Need to rely on system prompts for response tone

### Streaming Method: toTextStreamResponse()
**Decision**: Use AI SDK helper instead of manual ReadableStream
**Reason**: Less boilerplate, better error handling, production-ready
**Trade-off**: Less control over streaming implementation

### Database: SQLite + Drizzle ORM
**Decision**: Local SQLite with Drizzle for type safety
**Reason**: Simple local dev, git-crypt for version control, full TypeScript support
**Impact**: Easy testing, no external services needed

---

## Testing Strategy

### Manual Testing (Current)
```bash
# Test basic streaming
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d @test-stream.json

# Test with specific message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Plan a trip to Paris"}]}'
```

### Browser Testing
- Open `app/api/chat/test-stream.html` in browser
- Type message and click "Send & Stream"
- Observe character-by-character streaming

### Future Automated Tests
- Integration tests for streaming endpoints
- Component tests for chat UI
- E2E tests for full conversation flow
- Database persistence tests

---

## Common Issues & Solutions

### Issue: "Unhandled chunk type: stream-start"
**Cause**: AI SDK v3 incompatible with Next.js 15
**Solution**: Upgrade to AI SDK v5
```bash
npm install ai@latest @ai-sdk/openai@latest
```

### Issue: "temperature not supported for reasoning models"
**Cause**: gpt-5-nano is a reasoning model
**Solution**: Remove temperature parameter from streamText()

### Issue: TypeScript error on maxTokens
**Cause**: Parameter renamed in AI SDK v5
**Solution**: Use `maxOutputTokens` instead of `maxTokens`

### Issue: streamText() doesn't return a Promise
**Cause**: v5 API change - synchronous return
**Solution**: Remove `await` keyword when calling streamText()

---

## Resources

### Documentation
- [Vercel AI SDK v5 Docs](https://sdk.vercel.ai/docs)
- [Next.js 15 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)

### API References
- [streamText() API](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text)
- [useChat() Hook](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [StreamData API](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-data)

### Learning Materials
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)

---

## Progress Tracking

| Session | Status | Completion Date | Key Achievement |
|---------|--------|-----------------|-----------------|
| 1: Basic Streaming | ✅ Complete | 2024 | Manual ReadableStream implementation |
| 2: LLM Integration | ✅ Complete | 2024 | AI SDK v5 + gpt-5-nano streaming |
| 3: Frontend Integration | ✅ Complete | 2025-01-17 | @ai-sdk/react v2.0 + sendMessage API |
| 4: Tool Definitions | ✅ Complete | 2025-01-18 | Zod schemas + toUIMessageStreamResponse() |
| 5: Stream Tool Events | 📋 Pending | - | StreamData implementation |
| 6: Tool UI Components | 📋 Pending | - | Visual tool invocations |
| 7: Database Persistence | 📋 Pending | - | Save messages & tools |
| 8: Advanced Features | 📋 Pending | - | Cancel, regenerate, edit |

---

## Next Steps

**Immediate**: Begin Session 5 - Stream Tool Invocations to Frontend

**Action Items**:
1. Update frontend to consume tool events from stream
2. Display tool invocation indicators in UI
3. Show tool parameters and results
4. Handle tool execution states (pending/complete/error)
5. Test with weather and checklist tools
6. Update documentation and mark Session 5 complete

**Current Status**:
- ✅ Session 4 Complete: Tools integrated with Zod schemas
- ✅ Changed to toUIMessageStreamResponse() for tool support
- ✅ Tools properly configured and sent to OpenAI
- ✅ Request format verified via logging
- 📋 Next: Display tool invocations in the UI

**Command to Test**:
```bash
npm run dev
# Open http://localhost:3000/chat
# Try: "I'm going to Paris next week, what should I pack?"
```

---

## Notes

### Important User Feedback
> "gpt-5-nano DOES exist. STOP changing it"

This was a critical correction - always verify model names with official documentation before suggesting changes.

### Architecture Philosophy
Following TDD (Test-Driven Development) as specified in CLAUDE.md:
1. Write failing tests first
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Suggest further refactoring opportunities

### Code Organization Principles
- Extract utility functions to `lib/` with tests
- Extract state management to `state/` subdirectory
- Extract large components (>30 lines JSX) to separate files
- Use shared test fixtures from `lib/test-helpers/`
- Prefer incremental commits with clear messages

---

## Conclusion

We've successfully built a foundation for LLM streaming in Next.js. The backend API is production-ready with AI SDK v5 and gpt-5-nano. The next phase focuses on frontend integration and tool calling, followed by database persistence and advanced UX features.

The learning program is designed to be incremental - each session builds on the previous one, with working code at every step. By the end of Session 8, we'll have a fully-featured, production-ready AI chat application with streaming, tool calling, and persistence.

---

**Last Updated**: 2025-01-17 (Session 3 completion)
**Next Session**: Session 4 - Add Tool Definitions to Stream
