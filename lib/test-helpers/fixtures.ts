/**
 * Shared test fixtures and mock factories
 * Eliminates duplicate mock creation across tests
 */

import type {
  Conversation,
  Checklist,
  ChecklistItem,
  ToolInvocation,
} from '@/lib/schema';

/**
 * Create a mock conversation
 */
export function createMockConversation(
  overrides?: Partial<Conversation>
): Conversation {
  return {
    id: 'conv-123',
    title: 'Test Conversation',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock checklist
 */
export function createMockChecklist(overrides?: Partial<Checklist>): Checklist {
  return {
    id: 'checklist-123',
    conversationId: 'conv-123',
    destination: 'Paris',
    startDate: '2024-06-01',
    endDate: '2024-06-07',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock checklist item
 */
export function createMockChecklistItem(
  overrides?: Partial<ChecklistItem>
): ChecklistItem {
  return {
    id: 'item-123',
    checklistId: 'checklist-123',
    item: 'Passport',
    category: 'Documents',
    quantity: 1,
    packed: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock tool invocation
 */
export function createMockToolInvocation(
  overrides?: Partial<ToolInvocation>
): ToolInvocation {
  return {
    id: 'tool-123',
    conversationId: 'conv-123',
    toolName: 'get_weather',
    parameters: { location: 'Paris', startDate: '2024-06-01', endDate: '2024-06-07' },
    result: { forecast: [] },
    error: null,
    durationMs: 250,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a batch of mock checklist items
 */
export function createMockChecklistItems(
  count: number,
  overrides?: Partial<ChecklistItem>
): ChecklistItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockChecklistItem({
      id: `item-${i}`,
      item: `Item ${i}`,
      ...overrides,
    })
  );
}
