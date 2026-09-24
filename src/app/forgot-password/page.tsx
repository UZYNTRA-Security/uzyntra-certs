import { RecoveryForm } from "@/components/auth/recovery-form";
import { pageMetadata } from "@/lib/metadata";
import { hasSupabaseConfig } from "@/lib/env/public";

export const metadata = pageMetadata("Forgot password", "Request a secure account recovery link.", "/forgot-password", false);
export default function ForgotPasswordPage() {
  return <div className="mx-auto max-w-lg space-y-6 px-6 py-20"><h1 className="text-3xl font-semibold">Forgot your password?</h1><p className="text-muted-foreground">Enter your account email to request a password reset link.</p><RecoveryForm enabled={hasSupabaseConfig()} /></div>;
}
