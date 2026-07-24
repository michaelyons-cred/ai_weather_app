import { displayTemp, toCelsius, type Unit } from "./temperature";

describe("toCelsius", () => {
  it.each([
    [32, 0],
    [212, 100],
    [98.6, 37],
    [-40, -40],
    [0, -18],
  ])("converts %p°F to %p°C (rounded)", (fahrenheit, expected) => {
    expect(toCelsius(fahrenheit)).toBe(expected);
  });

  it("rounds to the nearest whole degree", () => {
    // 72°F = 22.22…°C -> 22
    expect(toCelsius(72)).toBe(22);
    // 75°F = 23.88…°C -> 24
    expect(toCelsius(75)).toBe(24);
  });
});

describe("displayTemp", () => {
  it("passes Fahrenheit through unchanged", () => {
    expect(displayTemp(72, "F")).toBe(72);
  });

  it("converts to Celsius when the unit is C", () => {
    expect(displayTemp(72, "C")).toBe(22);
  });

  it("agrees with toCelsius for the C unit", () => {
    const unit: Unit = "C";
    for (const f of [0, 32, 50, 100, 212]) {
      expect(displayTemp(f, unit)).toBe(toCelsius(f));
    }
  });
});
