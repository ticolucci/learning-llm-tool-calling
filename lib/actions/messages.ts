'use server';

/**
 * Server actions for message management
 * Handles creating conversations and saving messages to the database
 */

import { db as defaultDb } from '@/lib/db';
import { conversations, messages } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

/**
 * Create a new conversation
 * @param options - Optional conversation details
 * @param dbInstance - Optional database instance (for testing)
 */
export async function createConversation(
  options?: { title?: string },
  dbInstance?: LibSQLDatabase<typeof import('../schema')>
): Promise<{ success: true; conversationId: string } | { success: false; error: string }> {
  const db = dbInstance || defaultDb;

  try {
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await db.insert(conversations).values({
      id: conversationId,
      title: options?.title || null,
    });

    return { success: true, conversationId };
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return {
      success: false,
      error: 'Failed to create conversation',
    };
  }
}

/**
 * Save a message to the database
 * Also updates the conversation's updatedAt timestamp
 *
 * @param params - Message details
 * @param dbInstance - Optional database instance (for testing)
 */
export async function saveMessage(
  params: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
  },
  dbInstance?: LibSQLDatabase<typeof import('../schema')>
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const db = dbInstance || defaultDb;

  // Validate input
  if (!params.content.trim()) {
    return {
      success: false,
      error: 'Content cannot be empty',
    };
  }

  try {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Save message
    await db.insert(messages).values({
      id: messageId,
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
    });

    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(conversations.id, params.conversationId));

    return { success: true, messageId };
  } catch (error) {
    console.error('Failed to save message:', error);
    return {
      success: false,
      error: 'Failed to save message',
    };
  }
}
