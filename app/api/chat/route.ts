/**
 * Chat API Route - Streaming endpoint for LLM interactions
 *
 * Session 4: Add Tool Definitions to Stream
 *
 * Learning Points:
 * 1. How to define tools for LLM to call
 * 2. How to add tools parameter to streamText()
 * 3. How AI SDK handles tool invocations
 * 4. How tools execute during streaming
 */

import { groq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getWeather } from '@/lib/weather';

// Allow up to 30 seconds for streaming responses
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Step 1: Extract the request body
    const body = await req.json();
    const { messages } = body;

    console.log('[Chat API] Received messages:', messages);
    console.log('[Chat API] Using Groq for streaming with tools...');

    // Step 2: Use AI SDK's streamText()
    // This is where the magic happens!
    //
    // streamText() does ALL of this for us:
    // - Calls Groq API with streaming enabled
    // - Receives Server-Sent Events from Groq
    // - Converts to a ReadableStream
    // - Handles errors and retries
    // - Formats response for Next.js
    //
    // With AI SDK v5, we get the result synchronously (no await needed!)
    const result = streamText({
      // Model configuration
      // Using llama-3.3-70b-versatile - Groq's powerful model with tool calling support
      // Other options: llama-3.1-70b-versatile, mixtral-8x7b-32768
      model: groq('llama-3.3-70b-versatile'),

      // Messages array (OpenAI chat format)
      // Each message has: { role: 'user' | 'assistant' | 'system', content: string }
      messages: messages,

      // Optional: System prompt to guide the AI
      system: 'You are a helpful travel planning assistant. You can help users plan trips, get weather forecasts, and create packing checklists.',

      // Note: temperature is NOT supported for reasoning models like gpt-5-nano
      // temperature: 0.7, // Removed - not supported

      // Optional: Maximum OUTPUT tokens to generate (renamed from maxTokens in v5)
      maxOutputTokens: 500,

      // 🎓 SESSION 4: Add tools for the LLM to call
      // Tools are functions the AI can invoke during conversation
      // In AI SDK v5, we use the tool() helper with Zod schemas for type safety
      tools: {
        // Weather tool - fetch forecasts for trip planning
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
            console.log('[Tool] get_weather result:', result);
            return result;
          },
        }),
      },

      // 🎓 SESSION 4: Configure tool calling behavior
      // 'auto' - Let the LLM decide when to use tools based on the conversation
      // 'required' - Force the LLM to use at least one tool
      // 'none' - Disable tool calling
      // { type: 'tool', toolName: 'get_weather' } - Force a specific tool
      toolChoice: 'auto',

      // 🎓 SESSION 4: Add callbacks to monitor tool invocations
      onStepFinish: (step) => {
        console.log('[Chat API] Step finished');
        console.log('[Chat API] Request body sent to Groq:', JSON.stringify(step.request?.body, null, 2));
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log('[Chat API] Tool calls:', JSON.stringify(step.toolCalls, null, 2));
        }
        if (step.toolResults && step.toolResults.length > 0) {
          console.log('[Chat API] Tool results:', JSON.stringify(step.toolResults, null, 2));
        }
      },

      onFinish: (result) => {
        console.log('[Chat API] Finished!');
        console.log('[Chat API] Text length:', result.text?.length || 0);
        console.log('[Chat API] Tool calls count:', result.toolCalls?.length || 0);
        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log('[Chat API] Tool calls:', JSON.stringify(result.toolCalls, null, 2));
        }
      },

      onError: (error) => {
        console.error('[Chat API] Error during streaming:', error);
      },
    });

    // Step 3: Use toUIMessageStreamResponse() helper for tool calling support
    // 🎓 SESSION 4: Changed from toTextStreamResponse() to toUIMessageStreamResponse()
    //
    // toTextStreamResponse() - Only streams plain text (no tool calls)
    // toUIMessageStreamResponse() - Streams UI messages including tool calls and results
    //
    // This is REQUIRED for tool calling to work properly!
    return result.toUIMessageStreamResponse();

    // 🎓 LEARNING NOTE:
    // Behind the scenes, this is similar to Session 1:
    //
    // const stream = new ReadableStream({
    //   async start(controller) {
    //     for await (const chunk of groqStream) {
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
