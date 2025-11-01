
export interface HourlyForecast {
    time: string;
    temp: number;
    condition: string;
    windSpeed: number;
    windDirection: number;
}

export interface DailyForecast {
    date: string;
    day: string;
    temp_max: number;
    temp_min: number;
    condition: string;
    precipitation: number;
}

export interface CurrentWeather {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    pressure: number;
    dewPoint: number;
    uvIndex: number;
    visibility: number;
    feelsLike: number;
    lastUpdated: string;
}

export interface WeatherData {
    city: string;
    country: string;
    current: CurrentWeather;
    hourly: HourlyForecast[];
    daily: DailyForecast[];
}

export interface CitySuggestion {
    name: string;
    country: string;
}
