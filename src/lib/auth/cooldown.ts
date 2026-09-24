export function remainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function cooldownLabel(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function emailProviderUrl(email?: string) {
  const domain = email?.split("@")[1]?.toLowerCase();
  const providers: Record<string, string> = {
    "gmail.com": "https://mail.google.com/", "googlemail.com": "https://mail.google.com/",
    "outlook.com": "https://outlook.live.com/mail/", "hotmail.com": "https://outlook.live.com/mail/", "live.com": "https://outlook.live.com/mail/",
    "yahoo.com": "https://mail.yahoo.com/", "proton.me": "https://mail.proton.me/", "protonmail.com": "https://mail.proton.me/",
  };
  return domain ? providers[domain] : undefined;
}
