import Image from "next/image";
import { WeatherCard } from "./weather-card";
import { LocationButton } from "./location-button";
import { SearchBox } from "./search-box";
import { getWeather, getWeatherByCoords } from "./weather-data";

const PAGE_SHELL =
  "bg-weather-gradient font-sans flex min-h-screen w-full items-center justify-center overflow-x-hidden px-0 py-6 sm:px-4 sm:py-10";

/**
 * Fallback messages shown when the browser geolocation lookup can't complete.
 * The client (LocationButton) redirects here with `?notice=<reason>` so the
 * message and the Dallas fallback share a single, server-rendered source.
 */
const LOCATION_NOTICES: Record<string, string> = {
  denied: "Location access was denied \u2014 showing Dallas, Texas instead.",
  timeout: "We couldn't find your location in time \u2014 showing Dallas, Texas.",
  unsupported: "Your browser doesn't support location \u2014 showing Dallas, Texas.",
  unavailable: "We couldn't determine your location \u2014 showing Dallas, Texas.",
};

/* ------------------------------------------------------------------ */
/* Server-rendered shell                                               */
/* ------------------------------------------------------------------ */

function Header({ city, region, date }: { city: string; region: string; date: string }) {
  return (
    <header className="mb-6 flex flex-col items-center gap-1 text-white">
      <div className="flex items-center gap-1.5">
        <Image
          src="/weather/pin.svg"
          alt=""
          aria-hidden
          width={11}
          height={15}
          unoptimized
          className="h-[15px] w-auto"
        />
        <span className="text-lg font-semibold">
          {city}
          {region ? `, ${region}` : ""}
        </span>
      </div>
      <p className="text-sm">{date}</p>
      <SearchBox />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    region?: string;
    lat?: string;
    lon?: string;
    notice?: string;
  }>;
}) {
  const { city, region, lat, lon, notice } = await searchParams;

  const latitude = Number(lat);
  const longitude = Number(lon);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  // A geolocation failure sends the user here without coordinates; surface the
  // matching message while the fetch below falls back to the default city.
  const noticeMessage =
    !hasCoords && notice
      ? (LOCATION_NOTICES[notice] ?? LOCATION_NOTICES.unavailable)
      : null;

  // A search selection carries exact coordinates plus its own label, so we can
  // skip reverse geocoding and show precisely what the user picked. The GPS
  // button sends coordinates only, so that path still reverse-geocodes.
  const result = hasCoords
    ? await getWeatherByCoords(
        latitude,
        longitude,
        city ? { city, region: region ?? "" } : undefined,
      )
    : await getWeather(city ?? "Dallas");

  if (result.status === "not-found") {
    return (
      <main className={PAGE_SHELL}>
        <div className="w-full max-w-[672px]">
          <div className="rounded-[3px] bg-white px-6 py-12 text-center shadow-[0_0_15px_0_rgba(0,0,0,0.2)]">
            <h1 className="text-forecast-text text-lg font-semibold">
              No weather found for &ldquo;{result.city}&rdquo;
            </h1>
            <p className="text-forecast-text/70 mt-2 text-sm">
              Check the spelling or try a nearby city.
            </p>
          </div>
          <div className="mt-4 flex justify-center">
            <SearchBox />
          </div>
          <LocationButton />
        </div>
      </main>
    );
  }

  const { current, forecast } = result.data;

  return (
    <main className={PAGE_SHELL}>
      <div className="w-full max-w-[672px]">
        {noticeMessage ? (
          <div
            role="status"
            className="mb-4 rounded-[3px] bg-white/15 px-4 py-2.5 text-center text-sm text-white backdrop-blur-sm"
          >
            {noticeMessage}
          </div>
        ) : null}
        <Header city={current.city} region={current.region} date={current.date} />
        <WeatherCard current={current} forecast={forecast} />
        <LocationButton />
      </div>
    </main>
  );
}
