import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loginSchema, LoginFormData } from '@/lib/validation/schemas';
import { useAuth } from '@/lib/hooks/use-auth';

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
      <div className="hidden lg:flex lg:w-1/2 bg-apptax-dark-gradient relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          {/* Primary floating blobs */}
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-apptax-teal/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] bg-apptax-blue/10 rounded-full blur-3xl animate-float-reverse" />

          {/* Secondary floating elements */}
          <div className="absolute top-[20%] left-[10%] w-32 h-32 bg-apptax-teal/5 rounded-full blur-2xl animate-float delay-300" />
          <div className="absolute bottom-[25%] right-[15%] w-24 h-24 bg-apptax-light-blue/10 rounded-full blur-2xl animate-float-reverse delay-500" />
          <div className="absolute top-[60%] left-[40%] w-20 h-20 bg-apptax-blue/5 rounded-full blur-xl animate-float delay-200" />

          {/* Decorative grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

          {/* Shimmer effect overlay */}
          <div className="absolute inset-0 animate-shimmer opacity-30" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12 animate-fade-in-left">
            <div className="relative">
              <img
                src="/apptax-logomark.svg"
                alt="AppTax"
                className="h-12 w-12"
              />
              {/* AI indicator glow behind logo */}
              <div className="absolute inset-0 bg-apptax-teal/30 rounded-lg blur-xl -z-10" />
            </div>
            <span className="text-2xl font-bold text-white">
              App<span className="text-apptax-light-blue">Tax</span>
            </span>
          </div>

          {/* Hero Text */}
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-6 animate-fade-in-left delay-100">
            AI-Powered Accounting Intelligence
          </h1>
          <p className="text-lg text-white/80 mb-8 animate-fade-in-left delay-200">
            Combine traditional accounting reliability with innovative AI capabilities.
            Transform how your accounting firm operates.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 animate-fade-in-left delay-300 group">
              <div className="w-2.5 h-2.5 rounded-full bg-apptax-teal animate-pulse-glow group-hover:scale-125 transition-transform" />
              <span className="text-white/70 group-hover:text-white/90 transition-colors">Intelligent automation</span>
            </div>
            <div className="flex items-center gap-3 animate-fade-in-left delay-400 group">
              <div className="w-2.5 h-2.5 rounded-full bg-apptax-teal animate-pulse-glow group-hover:scale-125 transition-transform" />
              <span className="text-white/70 group-hover:text-white/90 transition-colors">Polish tax compliance</span>
            </div>
            <div className="flex items-center gap-3 animate-fade-in-left delay-500 group">
              <div className="w-2.5 h-2.5 rounded-full bg-apptax-teal animate-pulse-glow group-hover:scale-125 transition-transform" />
              <span className="text-white/70 group-hover:text-white/90 transition-colors">Secure multi-tenant platform</span>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-8 left-12 right-12 animate-fade-in-left delay-700">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-apptax-warm-gray">
        <Card className="w-full max-w-md shadow-apptax-lg border-0 backdrop-blur-sm animate-fade-in-right hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300">
          <CardHeader className="space-y-4 pb-2">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="relative">
                <img
                  src="/apptax-logomark.svg"
                  alt="AppTax"
                  className="h-10 w-10"
                />
                <div className="absolute inset-0 bg-apptax-teal/20 rounded-lg blur-lg -z-10" />
              </div>
              <span className="text-xl font-bold text-apptax-navy">
                App<span className="text-apptax-blue">Tax</span>
              </span>
            </div>

            <CardTitle className="text-2xl font-bold text-apptax-navy">
              Welcome back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <div
                role="alert"
                data-testid="form-error"
                className="animate-fade-in-up mb-4 rounded-xl bg-destructive/10 border-l-4 border-destructive p-4 text-sm text-destructive"
              >
                {(error as any)?.response?.data?.message ||
                 (error as any)?.message ||
                 'Invalid credentials. Please try again.'}
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
                          className="h-12 rounded-xl border-2 border-gray-200 bg-white/80
                            focus:border-apptax-blue focus:ring-4 focus:ring-apptax-blue/10
                            hover:border-gray-300 transition-all duration-200
                            placeholder:text-gray-400"
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
                      <FormLabel className="text-apptax-navy font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="h-12 rounded-xl border-2 border-gray-200 bg-white/80
                            focus:border-apptax-blue focus:ring-4 focus:ring-apptax-blue/10
                            hover:border-gray-300 transition-all duration-200
                            placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-apptax-blue hover:bg-apptax-blue/90
                    text-white font-semibold rounded-xl
                    shadow-apptax-sm hover:shadow-apptax-md
                    active:scale-[0.98] transition-all duration-200
                    disabled:opacity-70 disabled:cursor-not-allowed
                    animate-fade-in-up delay-300"
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
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
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </Form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center animate-fade-in-up delay-400">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                Powered by AI
                <span className="inline-block w-2 h-2 rounded-full bg-apptax-teal animate-pulse-glow" />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
