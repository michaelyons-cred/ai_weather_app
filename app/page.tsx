import Image from "next/image";
import { WeatherCard } from "./weather-card";
import { getWeather } from "./weather-data";

const PAGE_SHELL =
  "bg-weather-gradient font-sans flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 py-10";

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
          {city}, {region}
        </span>
      </div>
      <p className="text-sm">{date}</p>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city = "Dallas" } = await searchParams;
  const result = await getWeather(city);

  if (result.status === "not-found") {
    return (
      <main className={PAGE_SHELL}>
        <div className="w-full max-w-[672px] rounded-[3px] bg-white px-6 py-12 text-center shadow-[0_0_15px_0_rgba(0,0,0,0.2)]">
          <h1 className="text-forecast-text text-lg font-semibold">
            No weather found for &ldquo;{result.city}&rdquo;
          </h1>
          <p className="text-forecast-text/70 mt-2 text-sm">
            Check the spelling or try a nearby city.
          </p>
        </div>
      </main>
    );
  }

  const { current, forecast } = result.data;

  return (
    <main className={PAGE_SHELL}>
      <div className="w-full max-w-[672px]">
        <Header city={current.city} region={current.region} date={current.date} />
        <WeatherCard current={current} forecast={forecast} />
      </div>
    </main>
  );
}
