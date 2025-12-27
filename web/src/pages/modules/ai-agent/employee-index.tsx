import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function EmployeeAIAgentDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          AI Agent Module
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Your intelligent AI assistant powered by advanced language models
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-apptax-md transition-shadow border-apptax-teal/20 hover:border-apptax-teal">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-apptax-ai-gradient text-white ai-glow">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-xl text-apptax-navy">AI Chat</CardTitle>
                <CardDescription className="text-base">
                  Start conversations and get intelligent answers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask questions, get help with tasks, and leverage AI to boost your productivity.
              The AI has access to your company&apos;s knowledge base for accurate, context-aware responses.
            </p>
            <Link to="/modules/ai-agent/chat">
              <Button size="lg" variant="teal" className="w-full">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Chatting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-apptax-warm-gray border-0">
          <CardHeader>
            <CardTitle className="text-apptax-navy">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Smart Conversations</p>
                <p className="text-sm text-muted-foreground">
                  AI understands context from your company documents
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Conversation History</p>
                <p className="text-sm text-muted-foreground">
                  Access all your past conversations anytime
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Always Available</p>
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
