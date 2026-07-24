import { test, expect } from "@playwright/test";

/**
 * The search autocomplete calls Open-Meteo's geocoder directly from the
 * browser, so it can be intercepted with page.route(). (The forecast/current
 * weather is fetched server-side and is not reachable this way.) We return a
 * fixed response and assert the exact values render in the UI — both in the
 * suggestions dropdown and, after selecting one, in the header.
 */
const GEOCODING_REQUEST = /geocoding-api\.open-meteo\.com\/v1\/search/;

const mockGeocoding = {
  results: [
    {
      id: 1,
      name: "Mockville",
      latitude: 12.34,
      longitude: 56.78,
      admin1: "Mock State",
      country: "Mockland",
      country_code: "MK",
    },
    {
      id: 2,
      name: "Faketown",
      latitude: -9.87,
      longitude: -65.43,
      admin1: "Fake Province",
      country: "Fakeland",
      country_code: "FK",
    },
  ],
};

test.describe("Search autocomplete (mocked geocoding response)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(GEOCODING_REQUEST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockGeocoding),
      });
    });
  });

  test("renders the exact cities returned by the mocked response", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("combobox", { name: /search for a city/i })
      .fill("mock");

    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(2);

    await expect(
      page.getByRole("option", { name: /mockville/i }),
    ).toContainText("Mock State, Mockland");
    await expect(
      page.getByRole("option", { name: /faketown/i }),
    ).toContainText("Fake Province, Fakeland");
  });

  test("selecting a mocked suggestion shows its name and region in the header", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("combobox", { name: /search for a city/i })
      .fill("mock");

    await page.getByRole("option", { name: /mockville/i }).click();

    // The selected name/region (from the mocked response) drive the header,
    // and the exact coordinates are carried in the URL.
    await expect(page).toHaveURL(/lat=12\.34&lon=56\.78/);
    await expect(page.getByText("Mockville, Mock State")).toBeVisible();
  });
});
