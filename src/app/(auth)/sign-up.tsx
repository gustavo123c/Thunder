import { AuthScreenLayout } from '@/components/ui/AuthScreenLayout';
import { SignUpForm } from '@/features/auth';

export default function SignUpScreen() {
  return (
    <AuthScreenLayout
      title="Criar conta"
      subtitle="Registre suas corridas, acompanhe sua evolução e corra com amigos."
    >
      <SignUpForm />
    </AuthScreenLayout>
  );
}
