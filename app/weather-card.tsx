"use client";

import Image from "next/image";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/* Data model                                                          */
/* ------------------------------------------------------------------ */

export type Unit = "C" | "F";

export type WeatherCondition =
  | "cloud-sun"
  | "lightning"
  | "drizzle-alt"
  | "drizzle-sun";

export interface DayForecast {
  id: string;
  label: string;
  condition: WeatherCondition;
  highF: number;
}

export interface CurrentWeather {
  city: string;
  region: string;
  date: string;
  tempF: number;
  condition: WeatherCondition;
  conditionLabel: string;
  windMph: number;
}

interface IconSpec {
  src: string;
  width: number;
  height: number;
}

const ICONS: Record<WeatherCondition, IconSpec> = {
  "cloud-sun": { src: "/weather/icon-cloud-sun.svg", width: 45, height: 40 },
  lightning: { src: "/weather/icon-lightning.svg", width: 36, height: 35 },
  "drizzle-alt": { src: "/weather/icon-drizzle-alt.svg", width: 38, height: 35 },
  "drizzle-sun": { src: "/weather/icon-drizzle-sun.svg", width: 45, height: 47 },
};

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  "cloud-sun": "Partly cloudy",
  lightning: "Thunderstorms",
  "drizzle-alt": "Light rain",
  "drizzle-sun": "Sun and drizzle",
};

/* ------------------------------------------------------------------ */
/* Temperature helpers (canonical unit is Fahrenheit)                  */
/* ------------------------------------------------------------------ */

function toCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

function displayTemp(fahrenheit: number, unit: Unit): number {
  return unit === "F" ? fahrenheit : toCelsius(fahrenheit);
}

/* ------------------------------------------------------------------ */
/* Presentational components                                           */
/* ------------------------------------------------------------------ */

function WeatherIcon({
  condition,
  className,
  decorative = false,
}: {
  condition: WeatherCondition;
  className?: string;
  decorative?: boolean;
}) {
  const icon = ICONS[condition];
  return (
    <Image
      src={icon.src}
      alt={decorative ? "" : CONDITION_LABELS[condition]}
      aria-hidden={decorative || undefined}
      width={icon.width}
      height={icon.height}
      className={className}
      unoptimized
    />
  );
}

function UnitToggle({ unit, onToggle }: { unit: Unit; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch temperature units. Currently showing ${
        unit === "F" ? "Fahrenheit" : "Celsius"
      }.`}
      className="bg-toggle/65 focus-visible:ring-toggle absolute top-4 right-5 z-10 flex h-6 w-14 cursor-pointer items-center rounded-full text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <span
        className={`relative z-10 flex-1 text-center ${
          unit === "C" ? "text-toggle" : "text-white"
        }`}
      >
        C
      </span>
      <span
        className={`relative z-10 flex-1 text-center ${
          unit === "F" ? "text-toggle" : "text-white"
        }`}
      >
        F
      </span>
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-all ${
          unit === "F" ? "right-1" : "left-1"
        }`}
      />
    </button>
  );
}

function CurrentConditions({
  current,
  unit,
}: {
  current: CurrentWeather;
  unit: Unit;
}) {
  return (
    <div className="text-sky-accent absolute top-4 left-5 z-10 flex items-start gap-2 sm:top-5 sm:left-7">
      <span className="text-3xl leading-none sm:text-4xl md:text-5xl">
        {displayTemp(current.tempF, unit)}&deg;
      </span>
      {/* Icon is decorative here: the condition is already stated in the text beside it */}
      <WeatherIcon
        condition={current.condition}
        decorative
        className="mt-0.5 h-8 w-auto sm:h-10"
      />
      <div className="text-xs font-semibold sm:text-sm">
        <p>{current.conditionLabel}</p>
        <p>{current.windMph} mph</p>
      </div>
    </div>
  );
}

function ForecastDay({
  day,
  unit,
  showDivider,
}: {
  day: DayForecast;
  unit: Unit;
  showDivider: boolean;
}) {
  return (
    <div
      className={`text-forecast-text flex flex-col items-center gap-3 py-5 ${
        showDivider ? "border-divider border-l" : ""
      }`}
    >
      <span className="text-sm font-bold">{day.label}</span>
      <WeatherIcon condition={day.condition} className="h-9 w-auto" />
      <span className="text-lg sm:text-xl md:text-2xl">
        {displayTemp(day.highF, unit)}&deg;
      </span>
    </div>
  );
}

function Forecast({ days, unit }: { days: DayForecast[]; unit: Unit }) {
  if (days.length === 0) {
    return (
      <p className="text-forecast-text/70 bg-white py-5 text-center text-sm">
        Forecast unavailable.
      </p>
    );
  }

  return (
    <div
      className="grid bg-white"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day, index) => (
        <ForecastDay
          key={day.id}
          day={day}
          unit={unit}
          showDivider={index > 0}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive card (client boundary — owns the unit state)           */
/* ------------------------------------------------------------------ */

export function WeatherCard({
  current,
  forecast,
}: {
  current: CurrentWeather;
  forecast: DayForecast[];
}) {
  const [unit, setUnit] = useState<Unit>("F");
  const toggleUnit = () => setUnit((prev) => (prev === "F" ? "C" : "F"));

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[3px] shadow-[0_0_15px_0_rgba(0,0,0,0.2)]">
        {/* Sky + skyline illustration */}
        <div className="relative aspect-[670/368] w-full bg-[#d6f0fa]">
          <Image
            src="/weather/skyline.png"
            alt={`${current.city} city skyline reflected over water`}
            fill
            priority
            sizes="672px"
            className="object-cover object-bottom"
          />
          <CurrentConditions current={current} unit={unit} />
          <UnitToggle unit={unit} onToggle={toggleUnit} />
        </div>

        {/* 5-day forecast */}
        <Forecast days={forecast} unit={unit} />
      </div>

      {/* Clouds that overflow the card edges (decorative) */}
      <Image
        src="/weather/cloud-left.svg"
        alt=""
        aria-hidden
        width={145}
        height={83}
        unoptimized
        className="pointer-events-none absolute top-[46%] -left-8 z-10 hidden w-24 rotate-6 sm:-left-12 sm:block sm:w-36"
      />
      <Image
        src="/weather/cloud-right.svg"
        alt=""
        aria-hidden
        width={207}
        height={113}
        unoptimized
        className="pointer-events-none absolute top-[30%] -right-8 z-10 hidden w-32 sm:-right-12 sm:block sm:w-52"
      />
    </div>
  );
}
