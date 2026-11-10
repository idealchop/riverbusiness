import { devAdminAllowlist } from '@/lib/admin-access';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return <LoginForm devAdminEmails={devAdminAllowlist()} />;
}
