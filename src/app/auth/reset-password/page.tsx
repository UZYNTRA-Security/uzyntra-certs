import ResetPasswordPage from "../../reset-password/page";
export { metadata } from "../../reset-password/page";

// Supabase production callbacks and the short route use exactly the same exchange.
export default function RecoveryCallbackPage(props: Parameters<typeof ResetPasswordPage>[0]) {
  return <ResetPasswordPage {...props} />;
}
