import { test, expect } from "@playwright/test";

/**
 * Empty and fallback states: the "no weather found" page for an unknown city,
 * the geolocation-fallback notice banner, and the inline "no cities found"
 * message in the search dropdown.
 */
test.describe("Empty and fallback states", () => {
  test("shows a not-found message for an unknown city", async ({ page }) => {
    await page.goto("/?city=zzzzzzzzzz");

    await expect(
      page.getByRole("heading", { name: /no weather found/i }),
    ).toBeVisible();
  });

  test("surfaces the geolocation fallback notice", async ({ page }) => {
    await page.goto("/?notice=denied");

    const notice = page.getByRole("status");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/dallas, texas/i);
  });

  test("shows an inline message when a search has no matches", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("combobox", { name: /search for a city/i })
      .fill("zzzzzzzzzz");

    await expect(page.getByText(/no cities found/i)).toBeVisible();
  });
});
