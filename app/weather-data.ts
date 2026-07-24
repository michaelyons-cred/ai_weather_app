import type {
  CurrentWeather,
  DayForecast,
  WeatherCondition,
} from "./weather-card";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Successful payload: current conditions + a 5-day forecast. */
export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
}

/**
 * Discriminated result so callers can render a friendly "city not found"
 * state without treating it as an unexpected (thrown) error. Network and
 * upstream failures still throw, so the route error boundary can offer retry.
 */
export type WeatherResult =
  | { status: "ok"; data: WeatherData }
  | { status: "not-found"; city: string };

/* ------------------------------------------------------------------ */
/* Open-Meteo response shapes (free API, no key required)              */
/* ------------------------------------------------------------------ */

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country_code?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

/**
 * Current conditions block. Mirrors the raw Open-Meteo JSON field names;
 * only the fields the app consumes are typed.
 * Source: current=temperature_2m,weather_code,wind_speed_10m
 */
interface CurrentConditions {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
}

/**
 * Daily forecast block. Open-Meteo returns parallel arrays indexed by day
 * (index 0 = today), so `time[i]`, `weather_code[i]`, and
 * `temperature_2m_max[i]` describe the same day.
 * Source: daily=weather_code,temperature_2m_max (plus the `time` axis)
 */
interface DailyForecast {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
}

interface ForecastResponse {
  current: CurrentConditions;
  daily: DailyForecast;
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Map a WMO weather-interpretation code to the limited icon set we exported
 * from Figma plus a human-readable label. Ranges collapse to the closest
 * available icon (e.g. snow reuses the rain icon).
 */
function describeWeather(code: number): {
  condition: WeatherCondition;
  label: string;
} {
  if (code <= 1) {
    return { condition: "cloud-sun", label: code === 0 ? "Clear sky" : "Mainly clear" };
  }
  if (code === 2) return { condition: "cloud-sun", label: "Partly cloudy" };
  if (code === 3) return { condition: "cloud-sun", label: "Overcast" };
  if (code === 45 || code === 48) return { condition: "cloud-sun", label: "Fog" };
  if (code >= 51 && code <= 57) return { condition: "drizzle-sun", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { condition: "drizzle-alt", label: "Rain" };
  if (code >= 71 && code <= 77) return { condition: "drizzle-alt", label: "Snow" };
  if (code >= 80 && code <= 82) return { condition: "drizzle-alt", label: "Rain showers" };
  if (code >= 85 && code <= 86) return { condition: "drizzle-alt", label: "Snow showers" };
  if (code >= 95) return { condition: "lightning", label: "Thunderstorm" };
  return { condition: "cloud-sun", label: "Unknown conditions" };
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

function formatToday(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

/* ------------------------------------------------------------------ */
/* Data fetching (runs on the server)                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve a city name to live current conditions + a 5-day forecast.
 * Temperatures are returned in Fahrenheit (the app's canonical unit).
 */
export async function getWeather(city: string): Promise<WeatherResult> {
  const geoUrl =
    `${GEOCODING_URL}?name=${encodeURIComponent(city)}` +
    `&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl, { next: { revalidate: 3600 } });
  if (!geoRes.ok) {
    throw new Error(`Geocoding request failed (${geoRes.status})`);
  }

  const geo: GeocodingResponse = await geoRes.json();
  const place = geo.results?.[0];
  if (!place) {
    return { status: "not-found", city };
  }

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "5",
  });
  const forecastRes = await fetch(`${FORECAST_URL}?${params.toString()}`, {
    next: { revalidate: 900 },
  });
  if (!forecastRes.ok) {
    throw new Error(`Forecast request failed (${forecastRes.status})`);
  }

  const payload: ForecastResponse = await forecastRes.json();
  const currentDescription = describeWeather(payload.current.weather_code);

  const current: CurrentWeather = {
    city: place.name,
    region: place.admin1 ?? place.country_code ?? "",
    date: formatToday(),
    tempF: Math.round(payload.current.temperature_2m),
    condition: currentDescription.condition,
    conditionLabel: currentDescription.label,
    windMph: Math.round(payload.current.wind_speed_10m),
  };

  const forecast: DayForecast[] = payload.daily.time.map((iso, index) => ({
    id: iso,
    label: WEEKDAY_FORMAT.format(new Date(iso)),
    condition: describeWeather(payload.daily.weather_code[index]).condition,
    highF: Math.round(payload.daily.temperature_2m_max[index]),
  }));

  return { status: "ok", data: { current, forecast } };
}
