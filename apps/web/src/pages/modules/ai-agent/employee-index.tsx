import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { NavigationCard } from '@/components/ui/navigation-card';

export default function EmployeeAIAgentDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Moduł Agent AI
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Twój inteligentny asystent AI zasilany zaawansowanymi modelami językowymi
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <NavigationCard
          title="Czat AI"
          description="Rozpocznij rozmowy i uzyskaj inteligentne odpowiedzi. Zadawaj pytania, uzyskaj pomoc przy zadaniach i wykorzystaj AI do zwiększenia produktywności."
          icon={MessageSquare}
          href="/modules/ai-agent/chat"
          gradient="bg-apptax-ai-gradient"
          buttonText="Rozpocznij czat"
        />

        <Card className="bg-apptax-warm-gray border-0">
          <CardHeader>
            <CardTitle className="text-apptax-navy">Funkcje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Inteligentne rozmowy</p>
                <p className="text-sm text-muted-foreground">
                  AI rozumie kontekst z dokumentów Twojej firmy
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Historia rozmów</p>
                <p className="text-sm text-muted-foreground">
                  Dostęp do wszystkich poprzednich rozmów w każdej chwili
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apptax-navy">Zawsze dostępny</p>
                <p className="text-sm text-muted-foreground">
                  Asystent AI gotowy do pomocy 24/7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
