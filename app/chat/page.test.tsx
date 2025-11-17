import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ChatPage from './page';

// Mock external dependencies with minimal implementation
const mockSendMessage = vi.fn();

vi.mock('@/lib/actions/messages', () => ({
  createConversation: vi.fn().mockResolvedValue({
    success: true,
    conversationId: 'test-conversation-id',
  }),
  saveMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    status: 'ready' as const,
    sendMessage: mockSendMessage,
  }),
}));

describe('ChatPage - UI Behavior', () => {
  describe('Initial Rendering', () => {
    it('displays the app title and description', () => {
      render(<ChatPage />);

      expect(screen.getByText('AI Packing Assistant')).toBeInTheDocument();
      expect(screen.getByText(/Tell me about your trip/)).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
      render(<ChatPage />);

      expect(screen.getByText('Start a conversation to plan your trip')).toBeInTheDocument();
      expect(screen.getByText(/Try: "I'm going to Paris next week"/)).toBeInTheDocument();
    });

    it('renders input field with placeholder', () => {
      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('renders send button', () => {
      render(<ChatPage />);

      const button = screen.getByRole('button', { name: 'Send' });
      expect(button).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
      render(<ChatPage />);

      const button = screen.getByRole('button', { name: 'Send' });
      expect(button).toBeDisabled();
    });
  });

  describe('Input Handling', () => {
    it('allows typing in the input field', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello world');

      expect(input).toHaveValue('Hello world');
    });

    it('enables send button when input has text', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      const button = screen.getByRole('button', { name: 'Send' });

      await user.type(input, 'Test');

      expect(button).not.toBeDisabled();
    });

    it('keeps send button disabled for whitespace-only input', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      const button = screen.getByRole('button', { name: 'Send' });

      await user.type(input, '   ');

      expect(button).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('calls sendMessage when form is submitted', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockClear();

      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: 'Send' }));

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message' });
    });

    it('clears input after submission', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');
      await user.click(screen.getByRole('button', { name: 'Send' }));

      expect(input).toHaveValue('');
    });

    it('trims whitespace from message before sending', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockClear();

      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, '  Hello  ');
      await user.click(screen.getByRole('button', { name: 'Send' }));

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('can submit via Enter key', async () => {
      const user = userEvent.setup();
      mockSendMessage.mockClear();

      render(<ChatPage />);

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test{Enter}');

      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test' });
      expect(input).toHaveValue('');
    });
  });
});
