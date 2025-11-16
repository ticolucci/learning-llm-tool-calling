/**
 * Chat API Route - Streaming endpoint for LLM interactions
 *
 * Session 2: Real LLM Streaming with AI SDK
 *
 * Learning Points:
 * 1. How to use Vercel AI SDK's streamText()
 * 2. How AI SDK handles streaming under the hood
 * 3. The difference between manual streaming vs AI SDK streaming
 * 4. How to configure the OpenAI provider
 */

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow up to 30 seconds for streaming responses
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Step 1: Extract the request body
    const body = await req.json();
    const { messages } = body;

    console.log('[Chat API] Received messages:', messages);
    console.log('[Chat API] Using OpenAI for streaming...');

    // Step 2: Use AI SDK's streamText()
    // This is where the magic happens!
    //
    // streamText() does ALL of this for us:
    // - Calls OpenAI API with streaming enabled
    // - Receives Server-Sent Events from OpenAI
    // - Converts to a ReadableStream
    // - Handles errors and retries
    // - Formats response for Next.js
    //
    // With AI SDK v5, we get the result synchronously (no await needed!)
    const result = streamText({
      // Model configuration
      model: openai('gpt-5-nano'),

      // Messages array (OpenAI chat format)
      // Each message has: { role: 'user' | 'assistant' | 'system', content: string }
      messages: messages,

      // Optional: System prompt to guide the AI
      system: 'You are a helpful travel planning assistant.',

      // Note: temperature is NOT supported for reasoning models like gpt-5-nano
      // temperature: 0.7, // Removed - not supported

      // Optional: Maximum OUTPUT tokens to generate (renamed from maxTokens in v5)
      maxOutputTokens: 500,
    });

    // Step 3: Use toTextStreamResponse() helper
    // This is the CORRECT way in AI SDK v5!
    //
    // 🎓 EDUCATIONAL: toTextStreamResponse() does what we did manually in Session 1:
    // - Creates a ReadableStream
    // - Encodes text chunks to UTF-8
    // - Sets proper streaming headers ('Content-Type: text/plain', etc.)
    // - Handles errors gracefully
    //
    // This replaces all the manual streaming code we wrote for learning!
    return result.toTextStreamResponse();

    // 🎓 LEARNING NOTE:
    // Behind the scenes, this is similar to Session 1:
    //
    // const stream = new ReadableStream({
    //   async start(controller) {
    //     for await (const chunk of openaiStream) {
    //       controller.enqueue(encoder.encode(chunk));
    //     }
    //     controller.close();
    //   }
    // });
    //
    // But the AI SDK handles:
    // - API authentication
    // - Error handling
    // - Token counting
    // - Rate limiting
    // - Response parsing
    // - And much more!
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
