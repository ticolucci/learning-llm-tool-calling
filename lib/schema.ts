import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Conversations table - stores chat sessions with the AI
 */
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Checklists table - stores generated packing checklists
 */
export const checklists = sqliteTable('checklists', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  destination: text('destination').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Checklist items table - individual items in a packing checklist
 */
export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  checklistId: text('checklist_id')
    .notNull()
    .references(() => checklists.id, { onDelete: 'cascade' }),
  item: text('item').notNull(),
  category: text('category'),
  quantity: integer('quantity').default(1),
  packed: integer('packed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Tool invocations table - logs all LLM tool calls for learning/debugging
 */
export const toolInvocations = sqliteTable('tool_invocations', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(),
  parameters: text('parameters', { mode: 'json' }).notNull(),
  result: text('result', { mode: 'json' }),
  error: text('error'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Export types for use in the application
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Checklist = typeof checklists.$inferSelect;
export type NewChecklist = typeof checklists.$inferInsert;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;

export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type NewToolInvocation = typeof toolInvocations.$inferInsert;
