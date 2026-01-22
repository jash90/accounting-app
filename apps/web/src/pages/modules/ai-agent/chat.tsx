import { useState, useEffect, useRef, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  Zap,
  AlertCircle,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useSendMessage,
  useSendMessageStream,
  useDeleteConversation,
  useAIConfiguration,
} from '@/lib/hooks/use-ai-agent';
import { cn } from '@/lib/utils/cn';
import { MessageRole } from '@/types/dtos';

export default function AIAgentChatPage() {
  // Keep useNavigate for potential future use or remove if not needed
  useNavigate();
  const [userSelectedConversationId, setUserSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useConversations();

  // Derive active conversation ID - auto-select first if user hasn't selected one
  const selectedConversationId = useMemo(() => {
    // If user explicitly selected a conversation, verify it still exists
    if (userSelectedConversationId !== null) {
      if (conversations?.some((c) => c.id === userSelectedConversationId)) {
        return userSelectedConversationId;
      }
    }
    // Default to first conversation if available
    return conversations?.[0]?.id ?? null;
  }, [userSelectedConversationId, conversations]);
  const { data: currentConversation } = useConversation(selectedConversationId || '');
  const { data: aiConfig } = useAIConfiguration();
  const createConversation = useCreateConversation();
  const sendMessageMutation = useSendMessage(selectedConversationId || '');
  const {
    sendMessage: sendMessageStream,
    streamingContent,
    isStreaming,
    resetStream,
  } = useSendMessageStream(selectedConversationId || '');
  const deleteConversation = useDeleteConversation();

  // Check if streaming is enabled in config
  const isStreamingEnabled = aiConfig?.enableStreaming ?? false;
  const isSending = isStreamingEnabled ? isStreaming : sendMessageMutation.isPending;

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [currentConversation?.messages, streamingContent, isSending]);

  const handleNewConversation = async () => {
    const result = await createConversation.mutateAsync({
      title: `Nowy czat ${new Date().toLocaleString('pl-PL')}`,
    });
    setUserSelectedConversationId(result.id);
  };

  const sendMessageIfReady = async () => {
    if (!message.trim() || !selectedConversationId || isSending) return;

    const messageContent = message;
    setMessage('');

    try {
      if (isStreamingEnabled) {
        // Use streaming mode
        resetStream();
        await sendMessageStream(messageContent);
      } else {
        // Use regular mode
        await sendMessageMutation.mutateAsync({ content: messageContent });
      }
      // Clear rate limit warning on successful message
      setRateLimitHit(false);
    } catch (error: unknown) {
      setMessage(messageContent);
      // Check for rate limit error (429)
      const errorMessage = error instanceof Error ? error.message : '';
      const axiosStatus = (error as { response?: { status?: number } })?.response?.status;
      if (
        axiosStatus === 429 ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('rate limit')
      ) {
        setRateLimitHit(true);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageIfReady();
  };

  const handleDeleteConversation = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteConversation = async () => {
    if (conversationToDelete) {
      try {
        await deleteConversation.mutateAsync(conversationToDelete);
        if (selectedConversationId === conversationToDelete) {
          setUserSelectedConversationId(null);
        }
      } catch {
        // Error is handled by the mutation's error state
      }
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  if (conversationsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-apptax-navy flex items-center gap-3">
          <div className="bg-apptax-teal ai-glow h-3 w-3 animate-pulse rounded-full" />
          Ładowanie...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="ai-agent-chat-page">
      <div className="flex h-[calc(100vh-12rem)] gap-6">
        {/* Conversations Sidebar */}
        <Card className="flex w-80 flex-col" data-testid="conversations-sidebar">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" data-testid="conversations-title">
                Rozmowy
                <div className="bg-apptax-teal ai-glow h-2 w-2 rounded-full" />
              </CardTitle>
              <Button
                onClick={handleNewConversation}
                size="sm"
                variant="teal"
                disabled={createConversation.isPending}
                data-testid="new-chat-button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Historia Twoich rozmów z AI</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-2 pb-4">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setUserSelectedConversationId(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setUserSelectedConversationId(conv.id);
                      }
                    }}
                    className={cn(
                      'group w-full cursor-pointer rounded-lg p-3 text-left transition-all duration-200',
                      selectedConversationId === conv.id
                        ? 'bg-apptax-blue shadow-apptax-sm text-white'
                        : 'hover:bg-apptax-soft-teal'
                    )}
                    data-testid="conversation-item"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="flex-1 truncate font-medium"
                        data-testid="conversation-title"
                      >
                        {conv.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className={cn(
                          'h-7 w-7 p-0 opacity-0 group-hover:opacity-100',
                          selectedConversationId === conv.id
                            ? 'hover:bg-white/20'
                            : 'hover:bg-destructive/10'
                        )}
                        data-testid="delete-conversation-button"
                      >
                        <Trash2
                          className={cn(
                            'h-4 w-4',
                            selectedConversationId === conv.id ? 'text-white' : 'text-destructive'
                          )}
                        />
                      </Button>
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        selectedConversationId === conv.id
                          ? 'text-white/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {new Date(conv.createdAt).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                ))}
                {conversations?.length === 0 && (
                  <p
                    className="text-muted-foreground py-8 text-center text-sm"
                    data-testid="no-conversations"
                  >
                    Brak rozmów. Utwórz nową, aby rozpocząć!
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-1 flex-col" data-testid="chat-area">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2" data-testid="ai-assistant-title">
              <Sparkles className="text-apptax-teal h-5 w-5" />
              Asystent AI
            </CardTitle>
            <CardDescription>
              {currentConversation ? currentConversation.title : 'Wybierz lub utwórz rozmowę'}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {currentConversation?.messages.length === 0 && (
                <div
                  className="text-muted-foreground flex h-full items-center justify-center"
                  data-testid="empty-chat"
                >
                  <div className="text-center">
                    <div className="bg-apptax-ai-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-apptax-navy text-lg font-medium">Rozpocznij rozmowę</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Zapytaj asystenta AI o cokolwiek
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-4" data-testid="messages-container">
                {[...(currentConversation?.messages ?? [])]
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
                      )}
                      data-testid={
                        msg.role === MessageRole.USER ? 'user-message' : 'assistant-message'
                      }
                    >
                      {msg.role === MessageRole.ASSISTANT && (
                        <div className="bg-apptax-ai-gradient ai-glow flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[70%] rounded-xl px-4 py-3',
                          msg.role === MessageRole.USER
                            ? 'bg-apptax-blue text-white'
                            : 'bg-apptax-soft-teal text-apptax-navy'
                        )}
                      >
                        <p className="whitespace-pre-wrap" data-testid="message-content">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            'mt-2 text-xs',
                            msg.role === MessageRole.USER ? 'text-white/70' : 'text-apptax-navy/50'
                          )}
                          data-testid="token-count"
                        >
                          {new Date(msg.createdAt).toLocaleTimeString('pl-PL')} •{' '}
                          {msg.totalTokens ?? 0} tokenów
                        </p>
                      </div>
                      {msg.role === MessageRole.USER && (
                        <div className="bg-apptax-navy flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                {/* Streaming content or thinking indicator */}
                {isStreaming && streamingContent && (
                  <div className="flex gap-3" data-testid="streaming-message">
                    <div className="bg-apptax-ai-gradient ai-glow flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-apptax-soft-teal max-w-[70%] rounded-xl px-4 py-3">
                      <p className="text-apptax-navy whitespace-pre-wrap">{streamingContent}</p>
                      <p className="text-apptax-navy/50 mt-2 flex items-center gap-2 text-xs">
                        <span className="bg-apptax-teal inline-block h-2 w-2 animate-pulse rounded-full" />
                        Przesyłanie...
                      </p>
                    </div>
                  </div>
                )}
                {isSending && !streamingContent && (
                  <div className="flex gap-3" data-testid="thinking-indicator">
                    <div className="bg-apptax-ai-gradient ai-glow flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                      <Bot className="h-4 w-4 animate-pulse text-white" />
                    </div>
                    <div className="bg-apptax-soft-teal rounded-xl px-4 py-3">
                      <p className="text-apptax-navy flex items-center gap-2">
                        <span className="bg-apptax-teal inline-block h-2 w-2 animate-pulse rounded-full" />
                        Myślę...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Token/Message Info Bar */}
            {currentConversation && (
              <div className="bg-apptax-warm-gray/30 text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {currentConversation.messages.length} wiadomości
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {currentConversation.messages
                      .reduce((sum, m) => sum + (m.totalTokens ?? 0), 0)
                      .toLocaleString()}{' '}
                    tokenów
                  </span>
                </div>
                {rateLimitHit && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Osiągnięto limit - poczekaj przed wysłaniem kolejnych wiadomości
                  </span>
                )}
              </div>
            )}

            {/* Input Form */}
            <div className="bg-apptax-warm-gray/50 border-t p-4" data-testid="message-input-area">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessageIfReady();
                    }
                  }}
                  placeholder="Wpisz wiadomość..."
                  disabled={!selectedConversationId || isSending}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  variant="teal"
                  disabled={!message.trim() || !selectedConversationId || isSending}
                  data-testid="send-button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setConversationToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń rozmowę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć tę rozmowę? Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
