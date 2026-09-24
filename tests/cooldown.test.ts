import assert from "node:assert/strict";
import test from "node:test";
import { remainingSeconds, cooldownLabel, emailProviderUrl } from "../src/lib/auth/cooldown";
test("resend cooldown stays disabled until 90 seconds and survives time jumps", () => {
  const start = 1000, deadline = start + 90_000;
  assert.equal(cooldownLabel(remainingSeconds(deadline, start)), "01:30");
  assert.equal(remainingSeconds(deadline, start + 89_999), 1);
  assert.equal(remainingSeconds(deadline, start + 90_000), 0);
  assert.equal(remainingSeconds(deadline, start + 500_000), 0);
});
test("email provider shortcuts use a fixed allowlist and never reflect an arbitrary domain", () => {
  assert.equal(emailProviderUrl("user@gmail.com"), "https://mail.google.com/");
  assert.equal(emailProviderUrl("user@attacker.example"), undefined);
});
