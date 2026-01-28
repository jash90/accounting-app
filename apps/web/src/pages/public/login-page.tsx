import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { loginSchema, type LoginFormData } from '@/lib/validation/schemas';

export default function LoginPage() {
  const { login, isPending, error } = useAuth();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Brand Hero */}
      <div className="bg-apptax-dark-gradient relative hidden overflow-hidden lg:flex lg:w-1/2">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          {/* Primary floating blobs */}
          <div className="bg-apptax-teal/10 animate-float absolute top-[-50%] right-[-20%] h-[600px] w-[600px] rounded-full blur-3xl" />
          <div className="bg-apptax-blue/10 animate-float-reverse absolute bottom-[-30%] left-[-10%] h-[400px] w-[400px] rounded-full blur-3xl" />

          {/* Secondary floating elements */}
          <div className="bg-apptax-teal/5 animate-float absolute top-[20%] left-[10%] h-32 w-32 rounded-full blur-2xl delay-300" />
          <div className="bg-apptax-light-blue/10 animate-float-reverse absolute right-[15%] bottom-[25%] h-24 w-24 rounded-full blur-2xl delay-500" />
          <div className="bg-apptax-blue/5 animate-float absolute top-[60%] left-[40%] h-20 w-20 rounded-full blur-xl delay-200" />

          {/* Decorative grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

          {/* Shimmer effect overlay */}
          <div className="animate-shimmer absolute inset-0 opacity-30" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto flex max-w-lg flex-col justify-center p-12">
          {/* Logo */}
          <div className="animate-fade-in-left mb-12 flex items-center gap-3">
            <div className="relative">
              <img src="/apptax-logomark.svg" alt="AppTax" className="h-12 w-12" />
              {/* AI indicator glow behind logo */}
              <div className="bg-apptax-teal/30 absolute inset-0 -z-10 rounded-lg blur-xl" />
            </div>
            <span className="text-2xl font-bold text-white">
              App<span className="text-apptax-light-blue">Tax</span>
            </span>
          </div>

          {/* Hero Text */}
          <h1 className="animate-fade-in-left mb-6 text-4xl leading-tight font-extrabold text-white delay-100">
            Inteligentna Księgowość AI
          </h1>
          <p className="animate-fade-in-left mb-8 text-lg text-white/80 delay-200">
            Połącz tradycyjną niezawodność księgowości z innowacyjnymi możliwościami AI. Zmień
            sposób działania Twojego biura rachunkowego.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="animate-fade-in-left group flex items-center gap-3 delay-300">
              <div className="bg-apptax-teal animate-pulse-glow h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125" />
              <span className="text-white/70 transition-colors group-hover:text-white/90">
                Inteligentna automatyzacja
              </span>
            </div>
            <div className="animate-fade-in-left group flex items-center gap-3 delay-400">
              <div className="bg-apptax-teal animate-pulse-glow h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125" />
              <span className="text-white/70 transition-colors group-hover:text-white/90">
                Zgodność z polskim prawem podatkowym
              </span>
            </div>
            <div className="animate-fade-in-left group flex items-center gap-3 delay-500">
              <div className="bg-apptax-teal animate-pulse-glow h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125" />
              <span className="text-white/70 transition-colors group-hover:text-white/90">
                Bezpieczna platforma wielodostępowa
              </span>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="animate-fade-in-left absolute right-12 bottom-8 left-12 delay-700">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="bg-apptax-warm-gray flex flex-1 items-center justify-center p-8">
        <Card className="shadow-apptax-lg animate-fade-in-right w-full max-w-md border-0 backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          <CardHeader className="space-y-4 pb-2">
            {/* Mobile Logo */}
            <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
              <div className="relative">
                <img src="/apptax-logomark.svg" alt="AppTax" className="h-10 w-10" />
                <div className="bg-apptax-teal/20 absolute inset-0 -z-10 rounded-lg blur-lg" />
              </div>
              <span className="text-apptax-navy text-xl font-bold">
                App<span className="text-apptax-blue">Tax</span>
              </span>
            </div>

            <CardTitle className="text-apptax-navy text-2xl font-bold">Witaj ponownie</CardTitle>
            <CardDescription className="text-muted-foreground">
              Wprowadź dane logowania, aby uzyskać dostęp do konta
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <div
                role="alert"
                data-testid="form-error"
                className="animate-fade-in-up bg-destructive/10 border-destructive text-destructive mb-4 rounded-xl border-l-4 p-4 text-sm"
              >
                {(error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ||
                  (error as Error)?.message ||
                  'Nieprawidłowe dane logowania. Spróbuj ponownie.'}
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="animate-fade-in-up delay-100">
                      <FormLabel className="text-apptax-navy font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          className="focus:border-apptax-blue focus:ring-apptax-blue/10 h-12 rounded-xl border-2 border-gray-200 bg-white/80 transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:ring-4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="animate-fade-in-up delay-200">
                      <FormLabel className="text-apptax-navy font-medium">Hasło</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Wprowadź hasło"
                          className="focus:border-apptax-blue focus:ring-apptax-blue/10 h-12 rounded-xl border-2 border-gray-200 bg-white/80 transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:ring-4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md animate-fade-in-up h-12 w-full rounded-xl font-semibold text-white transition-all delay-300 duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Logowanie...
                    </span>
                  ) : (
                    'Zaloguj się'
                  )}
                </Button>
              </form>
            </Form>

            {/* Footer */}
            <div className="animate-fade-in-up mt-8 border-t border-gray-100 pt-6 text-center delay-400">
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                Zasilane przez AI
                <span className="bg-apptax-teal animate-pulse-glow inline-block h-2 w-2 rounded-full" />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
