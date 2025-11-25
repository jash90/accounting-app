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
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-apptax-teal/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] bg-apptax-blue/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img
              src="/apptax-logomark.svg"
              alt="AppTax"
              className="h-12 w-12"
            />
            <span className="text-2xl font-bold text-white">
              App<span className="text-apptax-light-blue">Tax</span>
            </span>
          </div>

          {/* Hero Text */}
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-6">
            AI-Powered Accounting Intelligence
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Combine traditional accounting reliability with innovative AI capabilities.
            Transform how your accounting firm operates.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
              <span className="text-white/70">Intelligent automation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
              <span className="text-white/70">Polish tax compliance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
              <span className="text-white/70">Secure multi-tenant platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-apptax-warm-gray">
        <Card className="w-full max-w-md shadow-apptax-lg border-0">
          <CardHeader className="space-y-4 pb-2">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <img
                src="/apptax-logomark.svg"
                alt="AppTax"
                className="h-10 w-10"
              />
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
                className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
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
                    <FormItem>
                      <FormLabel className="text-apptax-navy font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          className="h-11 rounded-lg border-gray-200 focus:border-apptax-blue focus:ring-apptax-blue/20"
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
                    <FormItem>
                      <FormLabel className="text-apptax-navy font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="h-11 rounded-lg border-gray-200 focus:border-apptax-blue focus:ring-apptax-blue/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-apptax-blue hover:bg-apptax-blue/90 text-white font-semibold rounded-lg shadow-apptax-sm hover:shadow-apptax-md transition-all"
                  disabled={isPending}
                >
                  {isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-muted-foreground">
                Powered by AI
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-apptax-teal ml-1 ai-glow align-middle" />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
