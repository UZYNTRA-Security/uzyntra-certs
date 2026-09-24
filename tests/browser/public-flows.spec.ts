import { expect, test } from "@playwright/test";

test("verification requires no account and rejects malformed IDs", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Credential ID", { exact: true }).fill("invalid-id");
  await page.getByRole("button", { name: "Verify credential", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("complete credential ID");
  await page.goto("/v/not-an-id");
  await expect(page.getByRole("heading", { name: "No public credential found" })).toBeVisible();
  await expect(page).not.toHaveURL(/login/);
});
test("resend cooldown disables the button across reloads without sending email", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => { if (!sessionStorage.getItem("uzyntra-confirmation-retry-at")) sessionStorage.setItem("uzyntra-confirmation-retry-at", String(Date.now() + 90000)); });
  await page.goto("/login");
  await page.getByText("Need another confirmation email?", { exact: true }).click();
  await expect(page.getByRole("button", { name: /Resend in 01:/ })).toBeDisabled();
  await page.reload();
  await page.getByText("Need another confirmation email?", { exact: true }).click();
  await expect(page.getByRole("button", { name: /Resend in 01:/ })).toBeDisabled();
  await page.clock.fastForward(91000);
  await expect(page.getByRole("button", { name: "Resend confirmation email", exact: true })).toBeVisible();
});
test("account security redirects anonymous users and invalid recovery links offer a new link", async ({ page }) => {
  await page.goto("/dashboard/security");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await page.goto("/reset-password?error=expired");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password" })).toHaveCount(0);
});
test("reset forms clear token URLs and do not load Speed Insights", async ({ page }) => {
  const response = await page.goto("/reset-password?code=test-only-code");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await expect(page.locator('script[src*="speed-insights"]')).toHaveCount(0);
});

test("both recovery callback routes reject codes without a valid recovery session", async ({ page }) => {
  for (const path of ["/reset-password?code=test-code", "/auth/reset-password?code=test-code"]) {
    await page.goto(path);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(path.split("?")[0] + "$"));
  }
  await page.goto("/reset-password?code=first&code=second");
  await expect(page.getByRole("button", { name: "Update password" })).toHaveCount(0);
});
