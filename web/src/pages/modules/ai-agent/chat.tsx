import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2, Bot, User } from 'lucide-react';
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
  useDeleteConversation,
} from '@/lib/hooks/use-ai-agent';
import { cn } from '@/lib/utils/cn';
import { MessageRole } from '@/types/dtos';

export default function AIAgentChatPage() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: currentConversation } = useConversation(selectedConversationId || '');
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage(selectedConversationId || '');
  const deleteConversation = useDeleteConversation();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  // Auto-select first conversation if none selected
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedConversationId) return;

    const messageContent = message;
    setMessage('');

    await sendMessage.mutateAsync({ content: messageContent });
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
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6" data-testid="ai-agent-chat-page">
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations Sidebar */}
        <Card className="w-80 flex flex-col" data-testid="conversations-sidebar">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle data-testid="conversations-title">Conversations</CardTitle>
              <Button onClick={handleNewConversation} size="sm" disabled={createConversation.isPending} data-testid="new-chat-button">
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
                      'w-full text-left p-3 rounded-lg transition-colors group cursor-pointer',
                      selectedConversationId === conv.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
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
                        className="opacity-0 group-hover:opacity-100"
                        data-testid="delete-conversation-button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {conversations?.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4" data-testid="no-conversations">
                    No conversations yet. Create one to get started!
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col" data-testid="chat-area">
          <CardHeader>
            <CardTitle data-testid="ai-assistant-title">AI Assistant</CardTitle>
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
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation with the AI assistant</p>
                  </div>
                </div>
              )}
              <div className="space-y-4" data-testid="messages-container">
                {currentConversation?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
                    )}
                    data-testid={msg.role === MessageRole.USER ? 'user-message' : 'assistant-message'}
                  >
                    {msg.role === MessageRole.ASSISTANT && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2 max-w-[70%]',
                        msg.role === MessageRole.USER
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap" data-testid="message-content">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70" data-testid="token-count">
                        {new Date(msg.createdAt).toLocaleTimeString()} • {msg.totalTokens} tokens
                      </p>
                    </div>
                    {msg.role === MessageRole.USER && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3" data-testid="thinking-indicator">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <p className="text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Form */}
            <div className="p-4 border-t" data-testid="message-input-area">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && message.trim() && selectedConversationId && !sendMessage.isPending) {
                      e.preventDefault();
                      handleSendMessage(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={!selectedConversationId || sendMessage.isPending}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || !selectedConversationId || sendMessage.isPending}
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
