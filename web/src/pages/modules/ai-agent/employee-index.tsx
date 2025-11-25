import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Sparkles } from 'lucide-react';

export default function EmployeeAIAgentDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Module</h1>
        <p className="text-muted-foreground">
          Your intelligent AI assistant
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Chat</CardTitle>
                <CardDescription className="text-base">
                  Start conversations and get intelligent answers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask questions, get help with tasks, and leverage AI to boost your productivity.
              The AI has access to your company's knowledge base for accurate, context-aware responses.
            </p>
            <Link to="/modules/ai-agent/chat">
              <Button size="lg" className="w-full">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Chatting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-1">✓</div>
              <div>
                <p className="font-medium">Smart Conversations</p>
                <p className="text-sm text-muted-foreground">
                  AI understands context from your company documents
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1">✓</div>
              <div>
                <p className="font-medium">Conversation History</p>
                <p className="text-sm text-muted-foreground">
                  Access all your past conversations anytime
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1">✓</div>
              <div>
                <p className="font-medium">Always Available</p>
                <p className="text-sm text-muted-foreground">
                  24/7 AI assistant ready to help
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
