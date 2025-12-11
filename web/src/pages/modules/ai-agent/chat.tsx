import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2, Bot, User, Sparkles, MessageSquare, Zap, AlertCircle } from 'lucide-react';
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
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
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

  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleNewConversation = async () => {
    const result = await createConversation.mutateAsync({
      title: `New Chat ${new Date().toLocaleString()}`,
    });
    setSelectedConversationId(result.id);
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
      if (axiosStatus === 429 || errorMessage.includes('overloaded') || errorMessage.includes('rate limit')) {
        setRateLimitHit(true);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageIfReady();
  };

  const handleDeleteConversation = async (id: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation.mutateAsync(id);
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
      }
    }
  };

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-apptax-navy">
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="ai-agent-chat-page">
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations Sidebar */}
        <Card className="w-80 flex flex-col" data-testid="conversations-sidebar">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" data-testid="conversations-title">
                Conversations
                <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
              </CardTitle>
              <Button onClick={handleNewConversation} size="sm" variant="teal" disabled={createConversation.isPending} data-testid="new-chat-button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Your AI chat history</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-2 pb-4">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedConversationId(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedConversationId(conv.id);
                      }
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all duration-200 group cursor-pointer',
                      selectedConversationId === conv.id
                        ? 'bg-apptax-blue text-white shadow-apptax-sm'
                        : 'hover:bg-apptax-soft-teal'
                    )}
                    data-testid="conversation-item"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate flex-1" data-testid="conversation-title">{conv.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 h-7 w-7 p-0',
                          selectedConversationId === conv.id ? 'hover:bg-white/20' : 'hover:bg-destructive/10'
                        )}
                        data-testid="delete-conversation-button"
                      >
                        <Trash2 className={cn('h-4 w-4', selectedConversationId === conv.id ? 'text-white' : 'text-destructive')} />
                      </Button>
                    </div>
                    <p className={cn(
                      'text-xs mt-1',
                      selectedConversationId === conv.id ? 'text-white/70' : 'text-muted-foreground'
                    )}>
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {conversations?.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8" data-testid="no-conversations">
                    No conversations yet. Create one to get started!
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col" data-testid="chat-area">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2" data-testid="ai-assistant-title">
              <Sparkles className="h-5 w-5 text-apptax-teal" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              {currentConversation ? currentConversation.title : 'Select or create a conversation'}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {currentConversation?.messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="empty-chat">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-apptax-ai-gradient flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-lg font-medium text-apptax-navy">Start a conversation</p>
                    <p className="text-sm text-muted-foreground mt-1">Ask the AI assistant anything</p>
                  </div>
                </div>
              )}
              <div className="space-y-4" data-testid="messages-container">
                {[...(currentConversation?.messages ?? [])].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                ).map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
                    )}
                    data-testid={msg.role === MessageRole.USER ? 'user-message' : 'assistant-message'}
                  >
                    {msg.role === MessageRole.ASSISTANT && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-apptax-ai-gradient flex items-center justify-center ai-glow">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-xl px-4 py-3 max-w-[70%]',
                        msg.role === MessageRole.USER
                          ? 'bg-apptax-blue text-white'
                          : 'bg-apptax-soft-teal text-apptax-navy'
                      )}
                    >
                      <p className="whitespace-pre-wrap" data-testid="message-content">{msg.content}</p>
                      <p className={cn(
                        'text-xs mt-2',
                        msg.role === MessageRole.USER ? 'text-white/70' : 'text-apptax-navy/50'
                      )} data-testid="token-count">
                        {new Date(msg.createdAt).toLocaleTimeString()} • {msg.totalTokens ?? 0} tokens
                      </p>
                    </div>
                    {msg.role === MessageRole.USER && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-apptax-navy flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {/* Streaming content or thinking indicator */}
                {isStreaming && streamingContent && (
                  <div className="flex gap-3" data-testid="streaming-message">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-apptax-ai-gradient flex items-center justify-center ai-glow">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-apptax-soft-teal rounded-xl px-4 py-3 max-w-[70%]">
                      <p className="whitespace-pre-wrap text-apptax-navy">{streamingContent}</p>
                      <p className="text-xs mt-2 text-apptax-navy/50 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-apptax-teal animate-pulse" />
                        Streaming...
                      </p>
                    </div>
                  </div>
                )}
                {isSending && !streamingContent && (
                  <div className="flex gap-3" data-testid="thinking-indicator">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-apptax-ai-gradient flex items-center justify-center ai-glow">
                      <Bot className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-apptax-soft-teal rounded-xl px-4 py-3">
                      <p className="text-apptax-navy flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-apptax-teal animate-pulse" />
                        Thinking...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Token/Message Info Bar */}
            {currentConversation && (
              <div className="px-4 py-2 bg-apptax-warm-gray/30 border-t text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {currentConversation.messages.length} messages
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {currentConversation.messages.reduce((sum, m) => sum + (m.totalTokens ?? 0), 0).toLocaleString()} tokens
                  </span>
                </div>
                {rateLimitHit && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Rate limit reached - please wait before sending more messages
                  </span>
                )}
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 border-t bg-apptax-warm-gray/50" data-testid="message-input-area">
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
                  placeholder="Type your message..."
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
    </div>
  );
}
