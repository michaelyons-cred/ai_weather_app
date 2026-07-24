/* ------------------------------------------------------------------ */
/* Temperature helpers (canonical unit is Fahrenheit)                  */
/* ------------------------------------------------------------------ */

/** The unit a temperature is displayed in. */
export type Unit = "C" | "F";

/** Convert Fahrenheit to a rounded whole-degree Celsius value. */
export function toCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

/**
 * Return a temperature in the requested display unit. Values are stored in
 * Fahrenheit, so `"F"` passes through and `"C"` converts.
 */
export function displayTemp(fahrenheit: number, unit: Unit): number {
  return unit === "F" ? fahrenheit : toCelsius(fahrenheit);
}
