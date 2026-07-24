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
  /** IANA time-zone id (e.g. "America/Chicago") returned when timezone=auto. */
  timezone: string;
}

/**
 * Subset of BigDataCloud's reverse-geocode response we consume.
 * Source: /data/reverse-geocode-client
 */
interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  /** e.g. "US-CO" for Colorado. */
  principalSubdivisionCode?: string;
  countryCode?: string;
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEOCODE_URL =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

interface WeatherDescription {
  condition: WeatherCondition;
  label: string;
}

/**
 * Full WMO weather-interpretation code table. Each code maps to the closest
 * icon in our exported set (we only have four) plus a human-readable label.
 * To support a new code, add a row here — no control flow to touch.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
const WMO_WEATHER: Record<number, WeatherDescription> = {
  0: { condition: "cloud-sun", label: "Clear sky" },
  1: { condition: "cloud-sun", label: "Mainly clear" },
  2: { condition: "cloud-sun", label: "Partly cloudy" },
  3: { condition: "cloud-sun", label: "Overcast" },
  45: { condition: "cloud-sun", label: "Fog" },
  48: { condition: "cloud-sun", label: "Rime fog" },
  51: { condition: "drizzle-sun", label: "Light drizzle" },
  53: { condition: "drizzle-sun", label: "Drizzle" },
  55: { condition: "drizzle-sun", label: "Dense drizzle" },
  56: { condition: "drizzle-sun", label: "Freezing drizzle" },
  57: { condition: "drizzle-sun", label: "Freezing drizzle" },
  61: { condition: "drizzle-alt", label: "Light rain" },
  63: { condition: "drizzle-alt", label: "Rain" },
  65: { condition: "drizzle-alt", label: "Heavy rain" },
  66: { condition: "drizzle-alt", label: "Freezing rain" },
  67: { condition: "drizzle-alt", label: "Heavy freezing rain" },
  71: { condition: "drizzle-alt", label: "Light snow" },
  73: { condition: "drizzle-alt", label: "Snow" },
  75: { condition: "drizzle-alt", label: "Heavy snow" },
  77: { condition: "drizzle-alt", label: "Snow grains" },
  80: { condition: "drizzle-alt", label: "Light rain showers" },
  81: { condition: "drizzle-alt", label: "Rain showers" },
  82: { condition: "drizzle-alt", label: "Violent rain showers" },
  85: { condition: "drizzle-alt", label: "Light snow showers" },
  86: { condition: "drizzle-alt", label: "Snow showers" },
  95: { condition: "lightning", label: "Thunderstorm" },
  96: { condition: "lightning", label: "Thunderstorm with hail" },
  99: { condition: "lightning", label: "Thunderstorm with heavy hail" },
};

/** Fallback for any code Open-Meteo adds that we don't map yet. */
const UNKNOWN_WEATHER: WeatherDescription = {
  condition: "cloud-sun",
  label: "Unknown conditions",
};

/** Look up a WMO code, falling back gracefully for unmapped values. */
function describeWeather(code: number): WeatherDescription {
  return WMO_WEATHER[code] ?? UNKNOWN_WEATHER;
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

/**
 * Derive a human-readable city name from an IANA time-zone id.
 * Open-Meteo's geocoding endpoint is forward-only (name -> coordinates), so
 * for a coordinates-first lookup we fall back to the time zone the forecast
 * API reports, e.g. "America/Chicago" -> "Chicago". This is approximate: it
 * names the zone's anchor city, which is usually the nearest large city.
 */
function cityFromTimezone(timezone: string): string {
  const segment = timezone.split("/").at(-1) ?? timezone;
  return segment.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/* Data fetching (runs on the server)                                  */
/* ------------------------------------------------------------------ */

/** Fetch current conditions + a 5-day forecast for a coordinate pair. */
async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "5",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`, {
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    throw new Error(`Forecast request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Reverse-geocode coordinates to a "City, ST" label using BigDataCloud's free,
 * key-less endpoint (Open-Meteo's geocoder is forward-only). Returns null on
 * any failure so the caller can fall back to the time-zone label without
 * breaking the weather fetch. Results are effectively static per coordinate,
 * so they are cached for a day.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ city: string; region: string } | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  try {
    const res = await fetch(`${REVERSE_GEOCODE_URL}?${params.toString()}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return null;
    }
    const data: ReverseGeocodeResponse = await res.json();
    const city = data.city || data.locality;
    if (!city) {
      return null;
    }
    // "US-CO" -> "CO"; falls back to the full subdivision or country code.
    const region =
      data.principalSubdivisionCode?.split("-").at(-1) ||
      data.principalSubdivision ||
      data.countryCode ||
      "";
    return { city, region };
  } catch {
    return null;
  }
}

/** Shape a raw forecast payload into the app's canonical WeatherData. */
function buildWeatherData(
  payload: ForecastResponse,
  city: string,
  region: string,
): WeatherData {
  const currentDescription = describeWeather(payload.current.weather_code);

  const current: CurrentWeather = {
    city,
    region,
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

  return { current, forecast };
}

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

  const payload = await fetchForecast(place.latitude, place.longitude);
  const region = place.admin1 ?? place.country_code ?? "";

  return {
    status: "ok",
    data: buildWeatherData(payload, place.name, region),
  };
}

/**
 * Resolve raw coordinates (from the browser Geolocation API or a search
 * selection) to live weather. Because coordinates are always valid, this never
 * returns "not-found"; only the forecast fetch can throw. When a `label` is
 * supplied (search selections already know the place name), it is used as-is;
 * otherwise the "City, ST" label comes from reverse geocoding, falling back to
 * the forecast's time zone if that lookup fails.
 */
export async function getWeatherByCoords(
  latitude: number,
  longitude: number,
  label?: { city: string; region: string },
): Promise<WeatherResult> {
  if (label) {
    const payload = await fetchForecast(latitude, longitude);
    return {
      status: "ok",
      data: buildWeatherData(payload, label.city, label.region),
    };
  }

  const [payload, place] = await Promise.all([
    fetchForecast(latitude, longitude),
    reverseGeocode(latitude, longitude),
  ]);

  const city = place?.city ?? cityFromTimezone(payload.timezone);
  const region = place?.region ?? "";

  return {
    status: "ok",
    data: buildWeatherData(payload, city, region),
  };
}
