import { fireEvent, render, screen } from "@testing-library/react";
import { WeatherCard } from "./weather-card";
import type { CurrentWeather, DayForecast } from "./weather-card";

const current: CurrentWeather = {
  city: "Dallas",
  region: "Texas",
  date: "Friday, Jul 24, 2026",
  tempF: 72,
  condition: "cloud-sun",
  conditionLabel: "Partly cloudy",
  windMph: 9,
};

const forecast: DayForecast[] = [
  { id: "2026-07-24", label: "Fri", condition: "cloud-sun", highF: 94 },
  { id: "2026-07-25", label: "Sat", condition: "lightning", highF: 90 },
];

describe("WeatherCard", () => {
  it("renders current conditions in Fahrenheit by default", () => {
    render(<WeatherCard current={current} forecast={forecast} />);

    expect(screen.getByText("72°")).toBeInTheDocument();
    expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
    expect(screen.getByText("9 mph")).toBeInTheDocument();
  });

  it("renders every forecast day", () => {
    render(<WeatherCard current={current} forecast={forecast} />);

    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("94°")).toBeInTheDocument();
    expect(screen.getByText("90°")).toBeInTheDocument();
  });

  it("converts temperatures to Celsius when the unit is toggled", () => {
    render(<WeatherCard current={current} forecast={forecast} />);

    fireEvent.click(
      screen.getByRole("button", { name: /switch temperature units/i }),
    );

    // 72°F -> 22°C, 94°F -> 34°C, 90°F -> 32°C
    expect(screen.getByText("22°")).toBeInTheDocument();
    expect(screen.getByText("34°")).toBeInTheDocument();
    expect(screen.getByText("32°")).toBeInTheDocument();
    expect(screen.queryByText("72°")).not.toBeInTheDocument();
  });

  it("shows a fallback when there is no forecast data", () => {
    render(<WeatherCard current={current} forecast={[]} />);

    expect(screen.getByText("Forecast unavailable.")).toBeInTheDocument();
  });
});
