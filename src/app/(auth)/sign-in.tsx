import { AuthScreenLayout } from '@/components/ui/AuthScreenLayout';
import { SignInForm } from '@/features/auth';

export default function SignInScreen() {
  return (
    <AuthScreenLayout title="Entrar" subtitle="Bom te ver de novo. Bora correr?">
      <SignInForm />
    </AuthScreenLayout>
  );
}
