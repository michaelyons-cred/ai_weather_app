import { test, expect } from "@playwright/test";

/**
 * The temperature unit toggle. Weather data is live, so rather than asserting
 * exact degrees we verify the control's accessible name flips and that every
 * displayed temperature is re-rendered (Fahrenheit -> Celsius).
 */
test.describe("Temperature unit toggle", () => {
  test("switches the displayed temperatures between Fahrenheit and Celsius", async ({
    page,
  }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", {
      name: /switch temperature units/i,
    });
    await expect(toggle).toHaveAccessibleName(/currently showing fahrenheit/i);

    // Every temperature on the page renders as "<number>°".
    const temperatures = page.getByText(/^\d+°$/);
    const fahrenheit = await temperatures.allTextContents();
    expect(fahrenheit.length).toBeGreaterThan(0);

    await toggle.click();

    await expect(toggle).toHaveAccessibleName(/currently showing celsius/i);
    await expect(async () => {
      const celsius = await temperatures.allTextContents();
      expect(celsius).not.toEqual(fahrenheit);
    }).toPass();

    // Toggling back restores Fahrenheit.
    await toggle.click();
    await expect(toggle).toHaveAccessibleName(/currently showing fahrenheit/i);
  });
});
