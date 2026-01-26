import { Download, Smartphone, Wifi, X, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWA } from '@/lib/hooks/use-pwa';

interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const { canInstall, promptInstall, dismissInstallPrompt } = usePWA();

  if (!canInstall) return null;

  const benefits = [
    {
      icon: Zap,
      title: 'Faster access',
      description: 'Launch instantly from your home screen',
    },
    {
      icon: Wifi,
      title: 'Works offline',
      description: 'Access your data even without internet',
    },
    {
      icon: Smartphone,
      title: 'Native experience',
      description: 'Full-screen app without browser UI',
    },
  ];

  return (
    <Dialog open={canInstall} onOpenChange={(open) => !open && dismissInstallPrompt()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Install AppTax
          </DialogTitle>
          <DialogDescription>Add AppTax to your device for the best experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={dismissInstallPrompt} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Not now
          </Button>
          <Button onClick={promptInstall} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
