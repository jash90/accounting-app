import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

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
        <Card className="hover:shadow-apptax-md transition-shadow border-apptax-teal/20 hover:border-apptax-teal">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-apptax-ai-gradient text-white ai-glow">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-xl text-apptax-navy">Czat AI</CardTitle>
                <CardDescription className="text-base">
                  Rozpocznij rozmowy i uzyskaj inteligentne odpowiedzi
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Zadawaj pytania, uzyskaj pomoc przy zadaniach i wykorzystaj AI do zwiększenia produktywności.
              AI ma dostęp do bazy wiedzy Twojej firmy, zapewniając dokładne odpowiedzi świadome kontekstu.
            </p>
            <Link to="/modules/ai-agent/chat">
              <Button size="lg" variant="teal" className="w-full">
                <Sparkles className="mr-2 h-5 w-5" />
                Rozpocznij czat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

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
