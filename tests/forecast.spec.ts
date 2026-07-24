import { test, expect } from "@playwright/test";

/**
 * The five-day forecast strip. Labels and highs come from live data, so we
 * assert on structure: five weekday columns each showing a temperature.
 */
test.describe("Forecast section", () => {
  test("renders five day columns with weekday labels", async ({ page }) => {
    await page.goto("/");

    const dayLabels = page.getByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
    await expect(dayLabels).toHaveCount(5);
  });

  test("shows a temperature for every forecast day plus the current reading", async ({
    page,
  }) => {
    await page.goto("/");

    // One current temperature + five daily highs.
    await expect(page.getByText(/^\d+°$/)).toHaveCount(6);
  });
});
