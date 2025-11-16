import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checklistTool } from './checklist';
import { db } from '@/lib/db';
import { checklists, checklistItems } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

describe('checklistTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('has correct name', () => {
      expect(checklistTool.name).toBe('create_checklist');
    });

    it('has description', () => {
      expect(checklistTool.description).toBeTruthy();
    });

    it('requires conversationId, destination, startDate, endDate, and items', () => {
      expect(checklistTool.parameters.required).toEqual([
        'conversationId',
        'destination',
        'startDate',
        'endDate',
        'items',
      ]);
    });
  });

  describe('execute', () => {
    it('saves checklist to database with conversation ID', async () => {
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'checklist-456',
                conversationId: 'conv-123',
                destination: 'Tokyo',
                startDate: '2024-06-01',
                endDate: '2024-06-07',
                createdAt: new Date(),
              },
            ])
          ),
        })),
      }));

      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const params = {
        conversationId: 'conv-123',
        destination: 'Tokyo',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        items: [
          { item: 'Passport', category: 'Documents', quantity: 1 },
          { item: 'Camera', category: 'Electronics', quantity: 1 },
        ],
      };

      const result = await checklistTool.execute(params);

      // Verify checklist was inserted
      expect(mockInsert).toHaveBeenCalledWith(checklists);
      expect(result.success).toBe(true);
      expect(result.checklistId).toBe('checklist-456');
    });

    it('saves checklist items to database', async () => {
      const mockChecklistReturning = vi.fn(() =>
        Promise.resolve([
          {
            id: 'checklist-456',
            conversationId: 'conv-123',
            destination: 'Tokyo',
            startDate: '2024-06-01',
            endDate: '2024-06-07',
            createdAt: new Date(),
          },
        ])
      );

      const mockItemsReturning = vi.fn(() => Promise.resolve([]));

      let callCount = 0;
      const mockInsert = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call - checklist
          return {
            values: vi.fn(() => ({
              returning: mockChecklistReturning,
            })),
          };
        } else {
          // Second call - items
          return {
            values: vi.fn(() => ({
              returning: mockItemsReturning,
            })),
          };
        }
      });

      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const params = {
        conversationId: 'conv-123',
        destination: 'Tokyo',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        items: [
          { item: 'Passport', category: 'Documents', quantity: 1 },
          { item: 'Camera', category: 'Electronics', quantity: 1 },
        ],
      };

      await checklistTool.execute(params);

      // Verify items were inserted
      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenNthCalledWith(2, checklistItems);
    });

    it('returns error if conversationId is missing', async () => {
      const params = {
        destination: 'Tokyo',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        items: [{ item: 'Passport', category: 'Documents', quantity: 1 }],
      };

      const result = await checklistTool.execute(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('handles database errors gracefully', async () => {
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.reject(new Error('Database error'))),
        })),
      }));

      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const params = {
        conversationId: 'conv-123',
        destination: 'Tokyo',
        startDate: '2024-06-01',
        endDate: '2024-06-07',
        items: [{ item: 'Passport', category: 'Documents', quantity: 1 }],
      };

      const result = await checklistTool.execute(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });
});
