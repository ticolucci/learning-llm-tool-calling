'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { createConversation, saveMessage } from '@/lib/actions/messages';
import { ToolInvocation } from './components/ToolInvocation';

export default function ChatPage() {
  const conversationIdRef = useRef<string | null>(null);
  const [input, setInput] = useState('');

  // AI SDK v2 useChat hook - manages messages and streaming
  const { messages, sendMessage, status } = useChat({
    onFinish: ({ message }) => {
      // Save assistant message to database when streaming completes
      const content = getMessageText(message);
      if (content) {
        saveMessageInBackground('assistant', content);
      }
    },
  });

  // Helper function to extract text content from message parts
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join('');
  };

  // Helper function to extract tool invocations from message parts
  const getToolInvocations = (message: UIMessage) => {
    return message.parts.filter(
      (part) => part.type === 'dynamic-tool' || part.type.startsWith('tool-')
    );
  };

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      const result = await createConversation({ title: 'Packing Assistant Chat' });
      if (result.success) {
        conversationIdRef.current = result.conversationId;
      } else {
        console.error('Failed to create conversation:', result.error);
      }
    };

    initConversation();
  }, []);

  // Helper to save message in background
  const saveMessageInBackground = (role: 'user' | 'assistant', content: string) => {
    if (!conversationIdRef.current) {
      console.warn('No conversation ID available, skipping message save');
      return;
    }

    // Fire and forget - don't await
    saveMessage({
      conversationId: conversationIdRef.current,
      role,
      content,
    }).catch((error) => {
      console.error('Background save failed:', error);
    });
  };

  // Custom submit handler to save user messages before sending
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userMessage = input.trim();
    if (!userMessage) return;

    // Save user message to database
    saveMessageInBackground('user', userMessage);

    // Send message using AI SDK v2 API
    sendMessage({ text: userMessage });

    // Clear input
    setInput('');
  };

  // Derive loading state from status
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4">
      <header className="py-4 border-b">
        <h1 className="text-2xl font-bold">AI Packing Assistant</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tell me about your trip and I&apos;ll help you pack!
        </p>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">Start a conversation to plan your trip</p>
            <p className="text-sm mt-2">Try: &quot;I&apos;m going to Paris next week&quot;</p>
          </div>
        ) : (
          messages.map((msg) => {
            const textContent = getMessageText(msg);
            const toolInvocations = getToolInvocations(msg);

            return (
              <div key={msg.id}>
                {/* Render tool invocations */}
                {toolInvocations.map((toolPart, idx) => {
                  // Type guard for dynamic-tool parts
                  if (toolPart.type === 'dynamic-tool') {
                    return ( 
                      <ToolInvocation
                        key={`${msg.id}-tool-${idx}`}
                        toolName={toolPart.toolName}
                        toolCallId={toolPart.toolCallId}
                        state={toolPart.state}
                        input={'input' in toolPart ? toolPart.input : undefined}
                        output={'output' in toolPart ? toolPart.output : undefined}
                        errorText={'errorText' in toolPart ? toolPart.errorText : undefined}
                      />
                    );
                  }
                  return null;
                })}

                {/* Render text content if present */}
                {textContent && (
                  <div
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{textContent}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg px-4 py-2">
              <p className="text-gray-600 dark:text-gray-400">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
