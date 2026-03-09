import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateEmailDraft,
  useDeleteAllEmailDrafts,
  useDeleteEmailDraft,
  useDeleteEmails,
  useDownloadEmailAttachment,
  useEmailAiDrafts,
  useEmailDraft,
  useEmailDraftConflicts,
  useEmailDrafts,
  useEmailFolder,
  useEmailFolders,
  useEmailInbox,
  useEmailMessage,
  useGenerateEmailAiDraft,
  useGenerateEmailAiDraftStream,
  useInfiniteEmailFolder,
  useInfiniteEmailInbox,
  useMarkEmailsAsRead,
  useMoveEmails,
  useResolveEmailDraftConflict,
  useSearchEmails,
  useSendEmail,
  useSendEmailDraft,
  useSyncEmailDrafts,
  useUpdateEmailDraft,
  useUpdateEmailFlags,
  useUploadEmailAttachment,
} from './use-email-client';
import apiClient from '../api/client';
import { downloadBlob } from '../utils/download';

// Mock the API client and download utility
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../utils/download');
vi.mock('../auth/token-storage', () => ({
  tokenStorage: {
    getAccessToken: vi.fn().mockReturnValue('mock-token'),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockEmail = {
  uid: 101,
  seqno: 1,
  subject: 'Test email',
  from: [{ address: 'sender@example.com', name: 'Sender' }],
  to: [{ address: 'me@example.com', name: 'Me' }],
  cc: [],
  date: new Date('2024-06-01T10:00:00Z'),
  text: 'Hello world',
  html: '<p>Hello world</p>',
  flags: ['\\Seen'],
  attachments: [],
};

const mockDraft = {
  id: 'draft-1',
  to: ['recipient@example.com'],
  cc: [],
  subject: 'Draft subject',
  textContent: 'Draft body',
  htmlContent: '<p>Draft body</p>',
  isAiGenerated: false,
  createdAt: new Date('2024-06-01T10:00:00Z'),
  updatedAt: new Date('2024-06-01T10:00:00Z'),
  syncStatus: 'local' as const,
};

const mockMailboxInfo = [
  { path: 'INBOX', specialUse: '\\Inbox' },
  { path: 'Sent', specialUse: '\\Sent' },
  { path: 'Drafts', specialUse: '\\Drafts' },
];

const mockSyncResult = {
  synced: 2,
  imported: 1,
  conflicts: 0,
  deleted: 0,
  errors: [],
};

describe('use-email-client hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Inbox & Message Query Hooks
  // ========================================

  describe('useEmailInbox', () => {
    it('should fetch inbox emails', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockEmail] });

      const { result } = renderHook(() => useEmailInbox(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockEmail]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/inbox', {
        params: { limit: 50, unseenOnly: false },
      });
    });

    it('should pass custom limit and unseenOnly params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockEmail] });

      const { result } = renderHook(() => useEmailInbox(20, true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/inbox', {
        params: { limit: 20, unseenOnly: true },
      });
    });
  });

  describe('useEmailMessage', () => {
    it('should fetch single email by UID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEmail });

      const { result } = renderHook(() => useEmailMessage(101), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmail);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/101');
    });

    it('should not fetch when uid is undefined', () => {
      const { result } = renderHook(() => useEmailMessage(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Drafts Query Hooks
  // ========================================

  describe('useEmailDrafts', () => {
    it('should fetch all drafts', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockDraft] });

      const { result } = renderHook(() => useEmailDrafts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockDraft]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/drafts/my');
    });
  });

  describe('useEmailDraft', () => {
    it('should fetch single draft by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDraft });

      const { result } = renderHook(() => useEmailDraft('draft-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDraft);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/drafts/draft-1');
    });

    it('should not fetch when draftId is undefined', () => {
      const { result } = renderHook(() => useEmailDraft(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Folder Query Hooks
  // ========================================

  describe('useEmailFolders', () => {
    it('should fetch email folders', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockMailboxInfo });

      const { result } = renderHook(() => useEmailFolders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMailboxInfo);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/folders');
    });
  });

  describe('useEmailFolder', () => {
    it('should fetch emails from specific folder', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockEmail] });

      const { result } = renderHook(() => useEmailFolder('Sent', 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockEmail]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/folder/Sent', {
        params: { limit: 30 },
      });
    });

    it('should not fetch when folderName is undefined', () => {
      const { result } = renderHook(() => useEmailFolder(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Search Hook
  // ========================================

  describe('useSearchEmails', () => {
    it('should search emails when query is at least 2 chars', async () => {
      const mockSearchResult = {
        messages: [mockEmail],
        total: 1,
        unseen: 0,
        nextCursor: null,
        prevCursor: null,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSearchResult });

      const { result } = renderHook(() => useSearchEmails('test', 'INBOX', 'all'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSearchResult);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/search', {
        params: { q: 'test', mailbox: 'INBOX', field: 'all' },
      });
    });

    it('should not search when query is shorter than 2 chars', () => {
      const { result } = renderHook(() => useSearchEmails('t'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // AI Drafts Query Hooks
  // ========================================

  describe('useEmailAiDrafts', () => {
    it('should fetch AI-generated drafts', async () => {
      const aiDraft = { ...mockDraft, isAiGenerated: true };
      vi.mocked(apiClient.get).mockResolvedValue({ data: [aiDraft] });

      const { result } = renderHook(() => useEmailAiDrafts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([aiDraft]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/drafts/ai');
    });
  });

  describe('useEmailDraftConflicts', () => {
    it('should fetch drafts with sync conflicts', async () => {
      const conflictDraft = { ...mockDraft, syncStatus: 'conflict' as const };
      vi.mocked(apiClient.get).mockResolvedValue({ data: [conflictDraft] });

      const { result } = renderHook(() => useEmailDraftConflicts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([conflictDraft]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/drafts/conflicts');
    });
  });

  // ========================================
  // Send Email Mutation
  // ========================================

  describe('useSendEmail', () => {
    it('should send email successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useSendEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to: 'recipient@example.com',
          subject: 'Hello',
          text: 'Body text',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/modules/email-client/messages/send', {
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'Body text',
      });
    });

    it('should handle send failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Send failed'));

      const { result } = renderHook(() => useSendEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to: 'recipient@example.com',
          subject: 'Hello',
          text: 'Body text',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Draft Mutation Hooks
  // ========================================

  describe('useCreateEmailDraft', () => {
    it('should create draft successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockDraft });

      const { result } = renderHook(() => useCreateEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to: ['recipient@example.com'],
          subject: 'Draft subject',
          textContent: 'Draft body',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/modules/email-client/drafts', {
        to: ['recipient@example.com'],
        subject: 'Draft subject',
        textContent: 'Draft body',
      });
      expect(result.current.data).toEqual(mockDraft);
    });

    it('should handle create draft failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useCreateEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to: ['recipient@example.com'],
          textContent: 'Draft body',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateEmailDraft', () => {
    it('should update draft successfully', async () => {
      const updatedDraft = { ...mockDraft, subject: 'Updated subject' };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedDraft });

      const { result } = renderHook(() => useUpdateEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          draftId: 'draft-1',
          data: { subject: 'Updated subject' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/modules/email-client/drafts/draft-1', {
        subject: 'Updated subject',
      });
      expect(result.current.data).toEqual(updatedDraft);
    });

    it('should handle update draft failure', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          draftId: 'draft-1',
          data: { subject: 'Updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useSendEmailDraft', () => {
    it('should send draft successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useSendEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('draft-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/modules/email-client/drafts/draft-1/send');
    });

    it('should handle send draft failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Send draft failed'));

      const { result } = renderHook(() => useSendEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('draft-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteEmailDraft', () => {
    it('should delete draft successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useDeleteEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('draft-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/api/modules/email-client/drafts/draft-1');
    });

    it('should handle delete draft failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteEmailDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('draft-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteAllEmailDrafts', () => {
    it('should delete all drafts successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { deleted: 5, errors: [] },
      });

      const { result } = renderHook(() => useDeleteAllEmailDrafts(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/api/modules/email-client/drafts/all');
      expect(result.current.data).toEqual({ deleted: 5, errors: [] });
    });

    it('should handle delete all failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete all failed'));

      const { result } = renderHook(() => useDeleteAllEmailDrafts(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Mark Read / Delete / Move Mutations
  // ========================================

  describe('useMarkEmailsAsRead', () => {
    it('should mark emails as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useMarkEmailsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([101, 102, 103]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/modules/email-client/messages/mark-read', {
        messageUids: [101, 102, 103],
      });
    });

    it('should handle mark read failure', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue(new Error('Mark read failed'));

      const { result } = renderHook(() => useMarkEmailsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([101]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteEmails', () => {
    it('should delete emails by UIDs', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useDeleteEmails(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([101, 102]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/api/modules/email-client/messages', {
        data: { messageUids: [101, 102] },
      });
    });

    it('should handle delete emails failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteEmails(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate([101]);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useMoveEmails', () => {
    it('should move emails between folders', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useMoveEmails(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uids: [101, 102],
          sourceMailbox: 'INBOX',
          destinationMailbox: 'Archive',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/modules/email-client/messages/move', {
        uids: [101, 102],
        sourceMailbox: 'INBOX',
        destinationMailbox: 'Archive',
      });
    });

    it('should handle move failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Move failed'));

      const { result } = renderHook(() => useMoveEmails(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uids: [101],
          sourceMailbox: 'INBOX',
          destinationMailbox: 'Trash',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Flag Update Mutation
  // ========================================

  describe('useUpdateEmailFlags', () => {
    it('should update email flags (add star)', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { uid: 101, flags: ['\\Seen', '\\Flagged'] },
      });

      const { result } = renderHook(() => useUpdateEmailFlags(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uid: 101,
          add: ['\\Flagged'],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/modules/email-client/messages/101/flags', {
        add: ['\\Flagged'],
        remove: undefined,
        mailbox: undefined,
      });
    });

    it('should update email flags (remove flag)', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { uid: 101, flags: [] },
      });

      const { result } = renderHook(() => useUpdateEmailFlags(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uid: 101,
          remove: ['\\Seen'],
          mailbox: 'INBOX',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/modules/email-client/messages/101/flags', {
        add: undefined,
        remove: ['\\Seen'],
        mailbox: 'INBOX',
      });
    });

    it('should handle flag update failure', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue(new Error('Flag update failed'));

      const { result } = renderHook(() => useUpdateEmailFlags(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ uid: 101, add: ['\\Flagged'] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // AI Draft Generation Mutation
  // ========================================

  describe('useGenerateEmailAiDraft', () => {
    it('should generate AI draft reply', async () => {
      const aiDraft = { ...mockDraft, isAiGenerated: true };
      vi.mocked(apiClient.post).mockResolvedValue({ data: aiDraft });

      const { result } = renderHook(() => useGenerateEmailAiDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          messageUid: 101,
          tone: 'formal',
          length: 'medium',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/drafts/ai/generate-reply',
        { messageUid: 101, tone: 'formal', length: 'medium' }
      );
      expect(result.current.data).toEqual(aiDraft);
    });

    it('should generate AI draft with custom instructions', async () => {
      const aiDraft = { ...mockDraft, isAiGenerated: true };
      vi.mocked(apiClient.post).mockResolvedValue({ data: aiDraft });

      const { result } = renderHook(() => useGenerateEmailAiDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          messageUid: 101,
          customInstructions: 'Be concise and professional',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/drafts/ai/generate-reply',
        { messageUid: 101, customInstructions: 'Be concise and professional' }
      );
    });

    it('should handle AI draft generation failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('AI generation failed'));

      const { result } = renderHook(() => useGenerateEmailAiDraft(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ messageUid: 101 });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Sync & Conflict Resolution Mutations
  // ========================================

  describe('useSyncEmailDrafts', () => {
    it('should sync drafts with IMAP', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockSyncResult });

      const { result } = renderHook(() => useSyncEmailDrafts(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/modules/email-client/drafts/sync');
      expect(result.current.data).toEqual(mockSyncResult);
    });

    it('should handle sync failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useSyncEmailDrafts(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useResolveEmailDraftConflict', () => {
    it('should resolve conflict keeping local version', async () => {
      const resolvedDraft = { ...mockDraft, syncStatus: 'synced' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: resolvedDraft });

      const { result } = renderHook(() => useResolveEmailDraftConflict(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          draftId: 'draft-1',
          resolution: 'keep_local',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/drafts/draft-1/resolve-conflict',
        { resolution: 'keep_local' }
      );
    });

    it('should resolve conflict keeping IMAP version', async () => {
      const resolvedDraft = { ...mockDraft, syncStatus: 'synced' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: resolvedDraft });

      const { result } = renderHook(() => useResolveEmailDraftConflict(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          draftId: 'draft-1',
          resolution: 'keep_imap',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/drafts/draft-1/resolve-conflict',
        { resolution: 'keep_imap' }
      );
    });

    it('should handle conflict resolution failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Resolution failed'));

      const { result } = renderHook(() => useResolveEmailDraftConflict(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ draftId: 'draft-1', resolution: 'keep_local' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Attachment Hooks
  // ========================================

  describe('useUploadEmailAttachment', () => {
    it('should upload attachment successfully', async () => {
      const mockUpload = { path: '/uploads/file.pdf', filename: 'file.pdf', size: 1024 };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUpload });

      const { result } = renderHook(() => useUploadEmailAttachment(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test content'], 'file.pdf', { type: 'application/pdf' });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/attachments/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.current.data).toEqual(mockUpload);
    });

    it('should handle upload failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() => useUploadEmailAttachment(), {
        wrapper: createWrapper(),
      });

      const file = new File(['test'], 'file.pdf', { type: 'application/pdf' });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDownloadEmailAttachment', () => {
    it('should download attachment and trigger browser download', async () => {
      const mockBlobData = new ArrayBuffer(8);
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlobData });

      const { result } = renderHook(() => useDownloadEmailAttachment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uid: 101,
          filename: 'report.pdf',
          mailbox: 'INBOX',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/modules/email-client/messages/101/attachments/report.pdf',
        { params: { mailbox: 'INBOX' }, responseType: 'blob' }
      );
      expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report.pdf');
    });

    it('should download attachment without mailbox param', async () => {
      const mockBlobData = new ArrayBuffer(8);
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBlobData });

      const { result } = renderHook(() => useDownloadEmailAttachment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          uid: 101,
          filename: 'report.pdf',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/modules/email-client/messages/101/attachments/report.pdf',
        { params: undefined, responseType: 'blob' }
      );
    });

    it('should handle download failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Download failed'));

      const { result } = renderHook(() => useDownloadEmailAttachment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ uid: 101, filename: 'report.pdf' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // Infinite Query Hooks
  // ========================================

  describe('useInfiniteEmailInbox', () => {
    it('should fetch first page of infinite inbox', async () => {
      const mockPage = {
        messages: [mockEmail],
        total: 100,
        unseen: 5,
        nextCursor: null,
        prevCursor: 50,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPage });

      const { result } = renderHook(() => useInfiniteEmailInbox(25), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pages[0]).toEqual(mockPage);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/inbox', {
        params: { limit: 25 },
      });
    });

    it('should determine hasNextPage from prevCursor', async () => {
      const mockPage = {
        messages: [mockEmail],
        total: 100,
        unseen: 5,
        nextCursor: null,
        prevCursor: 50,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPage });

      const { result } = renderHook(() => useInfiniteEmailInbox(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasNextPage).toBe(true);
    });

    it('should report no next page when prevCursor is null', async () => {
      const mockPage = {
        messages: [mockEmail],
        total: 1,
        unseen: 0,
        nextCursor: null,
        prevCursor: null,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPage });

      const { result } = renderHook(() => useInfiniteEmailInbox(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe('useInfiniteEmailFolder', () => {
    it('should fetch first page of folder with infinite scroll', async () => {
      const mockPage = {
        messages: [mockEmail],
        total: 50,
        unseen: 2,
        nextCursor: null,
        prevCursor: 30,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPage });

      const { result } = renderHook(() => useInfiniteEmailFolder('Sent', 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pages[0]).toEqual(mockPage);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/messages/folder/Sent', {
        params: { limit: 20 },
      });
    });

    it('should not fetch when folderName is undefined', () => {
      const { result } = renderHook(() => useInfiniteEmailFolder(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Streaming AI Draft Hook
  // ========================================

  describe('useGenerateEmailAiDraftStream', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGenerateEmailAiDraftStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.content).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.draftId).toBeNull();
      expect(typeof result.current.startStream).toBe('function');
      expect(typeof result.current.stopStream).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should reset state when reset is called', async () => {
      const { result } = renderHook(() => useGenerateEmailAiDraftStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.content).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.draftId).toBeNull();
    });
  });

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should handle network error on inbox fetch', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useEmailInbox(), {
        wrapper: createWrapper(),
      });

      // useEmailInbox has retry: 1 hardcoded, so it takes longer to reach error state
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should handle network error on folder fetch', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useEmailFolder('INBOX'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle network error on search', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useSearchEmails('test query'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
