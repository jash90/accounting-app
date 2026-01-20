import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Settings, FolderOpen, BarChart3, Sparkles, CheckCircle2 } from 'lucide-react';
import { NavigationCard } from '@/components/ui/navigation-card';

export default function AdminAIAgentDashboard() {
  const features = [
    {
      title: 'Czat AI',
      description: 'Rozpocznij rozmowy z asystentem AI. Uzyskaj inteligentne odpowiedzi na podstawie bazy wiedzy.',
      icon: MessageSquare,
      href: '/admin/modules/ai-agent/chat',
      gradient: 'bg-apptax-ai-gradient',
    },
    {
      title: 'Konfiguracja AI',
      description: 'Skonfiguruj dostawcę AI (OpenAI/OpenRouter), model, klucze API i prompt systemowy.',
      icon: Settings,
      href: '/admin/modules/ai-agent/configuration',
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Pliki bazy wiedzy',
      description: 'Prześlij i zarządzaj plikami PDF, TXT i MD dla RAG (Retrieval Augmented Generation).',
      icon: FolderOpen,
      href: '/admin/modules/ai-agent/context',
      gradient: 'bg-apptax-dark-gradient',
    },
    {
      title: 'Zużycie tokenów',
      description: 'Zobacz zużycie tokenów we wszystkich firmach w systemie.',
      icon: BarChart3,
      href: '/admin/modules/ai-agent/token-usage',
      gradient: 'bg-gradient-to-br from-apptax-teal to-apptax-navy',
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Moduł Agent AI
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Inteligentny asystent AI z funkcjami RAG i zarządzaniem tokenami
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        {features.map((feature) => (
          <NavigationCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            gradient={feature.gradient}
          />
        ))}
      </div>

      <Card className="bg-apptax-warm-gray border-0">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-apptax-teal" />
            Szybki start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">1. Skonfiguruj dostawcę AI</p>
              <p className="text-sm text-muted-foreground">
                Ustaw dostawcę AI (OpenAI/OpenRouter) i model w Konfiguracji
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">2. Prześlij bazę wiedzy</p>
              <p className="text-sm text-muted-foreground">
                Dodaj pliki PDF, TXT lub MD, aby wzbogacić odpowiedzi AI o Twoje treści
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">3. Rozpocznij czat</p>
              <p className="text-sm text-muted-foreground">
                Zacznij rozmowy z odpowiedziami AI świadomymi kontekstu
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
