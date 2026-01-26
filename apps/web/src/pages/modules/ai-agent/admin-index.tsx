import {
  BarChart3,
  CheckCircle2,
  FolderOpen,
  MessageSquare,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';

export default function AdminAIAgentDashboard() {
  const features = [
    {
      title: 'Czat AI',
      description:
        'Rozpocznij rozmowy z asystentem AI. Uzyskaj inteligentne odpowiedzi na podstawie bazy wiedzy.',
      icon: MessageSquare,
      href: '/admin/modules/ai-agent/chat',
      gradient: 'bg-accent',
    },
    {
      title: 'Konfiguracja AI',
      description:
        'Skonfiguruj dostawcę AI (OpenAI/OpenRouter), model, klucze API i prompt systemowy.',
      icon: Settings,
      href: '/admin/modules/ai-agent/configuration',
      gradient: 'bg-primary',
    },
    {
      title: 'Pliki bazy wiedzy',
      description:
        'Prześlij i zarządzaj plikami PDF, TXT i MD dla RAG (Retrieval Augmented Generation).',
      icon: FolderOpen,
      href: '/admin/modules/ai-agent/context',
      gradient: 'bg-primary',
    },
    {
      title: 'Zużycie tokenów',
      description: 'Zobacz zużycie tokenów we wszystkich firmach w systemie.',
      icon: BarChart3,
      href: '/admin/modules/ai-agent/token-usage',
      gradient: 'bg-gradient-to-br from-accent to-primary',
    },
  ];

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Moduł Agent AI
          <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
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

      <Card className="bg-muted border-0">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="text-accent h-5 w-5" />
            Szybki start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium">1. Skonfiguruj dostawcę AI</p>
              <p className="text-muted-foreground text-sm">
                Ustaw dostawcę AI (OpenAI/OpenRouter) i model w Konfiguracji
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium">2. Prześlij bazę wiedzy</p>
              <p className="text-muted-foreground text-sm">
                Dodaj pliki PDF, TXT lub MD, aby wzbogacić odpowiedzi AI o Twoje treści
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium">3. Rozpocznij czat</p>
              <p className="text-muted-foreground text-sm">
                Zacznij rozmowy z odpowiedziami AI świadomymi kontekstu
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
