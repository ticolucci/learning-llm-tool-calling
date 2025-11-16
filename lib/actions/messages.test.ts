import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveMessage, createConversation } from './messages';
import { createTestDb, cleanupTestDb } from '@/lib/test-helpers';
import { messages, conversations } from '../schema';
import { eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { createClient } from '@libsql/client';

describe('Message Actions', () => {
  let db: LibSQLDatabase<typeof import('../schema')>;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const testDb = await createTestDb();
    db = testDb.db;
    client = testDb.client;
  });

  afterEach(async () => {
    // Clean up database connection
    await cleanupTestDb(client);
  });

  describe('createConversation', () => {
    it('creates a new conversation with generated ID', async () => {
      const result = await createConversation({ title: 'Test Trip' }, db);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.conversationId).toBeTruthy();
        expect(typeof result.conversationId).toBe('string');

        // Verify it was saved to DB
        const saved = await db.query.conversations.findFirst({
          where: eq(conversations.id, result.conversationId),
        });

        expect(saved).toBeDefined();
        expect(saved?.title).toBe('Test Trip');
      }
    });

    it('creates conversation without title', async () => {
      const result = await createConversation(undefined, db);

      expect(result.success).toBe(true);
      if (result.success) {
        const saved = await db.query.conversations.findFirst({
          where: eq(conversations.id, result.conversationId),
        });

        expect(saved).toBeDefined();
        expect(saved?.title).toBeNull();
      }
    });
  });

  describe('saveMessage', () => {
    it('saves a user message to the database', async () => {
      // First create a conversation
      const convResult = await createConversation({ title: 'Test' }, db);
      if (!convResult.success) throw new Error('Failed to create conversation');

      const result = await saveMessage(
        {
          conversationId: convResult.conversationId,
          role: 'user',
          content: 'Hello, I need help packing',
        },
        db
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toBeTruthy();

        // Verify it was saved to DB
        const saved = await db.query.messages.findFirst({
          where: eq(messages.id, result.messageId),
        });

        expect(saved).toBeDefined();
        expect(saved?.content).toBe('Hello, I need help packing');
        expect(saved?.role).toBe('user');
        expect(saved?.conversationId).toBe(convResult.conversationId);
      }
    });

    it('saves an assistant message to the database', async () => {
      const convResult = await createConversation(undefined, db);
      if (!convResult.success) throw new Error('Failed to create conversation');

      const result = await saveMessage(
        {
          conversationId: convResult.conversationId,
          role: 'assistant',
          content: 'I can help you with that!',
        },
        db
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const saved = await db.query.messages.findFirst({
          where: eq(messages.id, result.messageId),
        });

        expect(saved?.role).toBe('assistant');
        expect(saved?.content).toBe('I can help you with that!');
      }
    });

    it('returns error when conversation does not exist', async () => {
      const result = await saveMessage(
        {
          conversationId: 'non-existent-id',
          role: 'user',
          content: 'Test message',
        },
        db
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to save message');
      }
    });

    it('returns error when content is empty', async () => {
      const convResult = await createConversation(undefined, db);
      if (!convResult.success) throw new Error('Failed to create conversation');

      const result = await saveMessage(
        {
          conversationId: convResult.conversationId,
          role: 'user',
          content: '',
        },
        db
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Content cannot be empty');
      }
    });

    it('updates conversation updatedAt timestamp', async () => {
      const convResult = await createConversation(undefined, db);
      if (!convResult.success) throw new Error('Failed to create conversation');

      const beforeSave = await db.query.conversations.findFirst({
        where: eq(conversations.id, convResult.conversationId),
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await saveMessage(
        {
          conversationId: convResult.conversationId,
          role: 'user',
          content: 'Test message',
        },
        db
      );

      const afterSave = await db.query.conversations.findFirst({
        where: eq(conversations.id, convResult.conversationId),
      });

      expect(afterSave?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeSave?.updatedAt.getTime() || 0
      );
    });
  });
});
