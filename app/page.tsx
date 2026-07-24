import Image from "next/image";
import {
  WeatherCard,
  type CurrentWeather,
  type DayForecast,
} from "./weather-card";

/* ------------------------------------------------------------------ */
/* Static data (canonical unit is Fahrenheit)                          */
/* ------------------------------------------------------------------ */

const CURRENT: CurrentWeather = {
  city: "Dallas",
  region: "TX",
  date: "Saturday, Sep 16, 2018",
  tempF: 93,
  condition: "cloud-sun",
  conditionLabel: "Partly Cloudy",
  windMph: 12,
};

const FORECAST: DayForecast[] = [
  { id: "sun", label: "Sun", condition: "drizzle-sun", highF: 92 },
  { id: "mon", label: "Mon", condition: "lightning", highF: 87 },
  { id: "tue", label: "Tue", condition: "cloud-sun", highF: 93 },
  { id: "wed", label: "Wed", condition: "cloud-sun", highF: 95 },
  { id: "thu", label: "Thu", condition: "drizzle-alt", highF: 88 },
];

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

export default function Home() {
  return (
    <main className="bg-weather-gradient font-sans flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 py-10">
      <div className="w-full max-w-[672px]">
        <Header city={CURRENT.city} region={CURRENT.region} date={CURRENT.date} />
        <WeatherCard current={CURRENT} forecast={FORECAST} />
      </div>
    </main>
  );
}
