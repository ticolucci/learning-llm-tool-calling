/**
 * Weather API integration
 * Fetches weather forecasts for trip planning
 */

export interface WeatherData {
  date: string;
  temperature: {
    high: number;
    low: number;
    unit: 'C' | 'F';
  };
  conditions: string;
  precipitation: number;
  humidity: number;
}

export interface WeatherForecast {
  location: string;
  startDate: string;
  endDate: string;
  forecast: WeatherData[];
}

/**
 * Fetch weather forecast for a location and date range
 */
export async function getWeather(
  location: string,
  startDate: string,
  endDate: string
): Promise<WeatherForecast> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    // Return mock data if no API key is configured
    return getMockWeather(location, startDate, endDate);
  }

  try {
    // TODO: Implement actual weather API call
    // For now, return mock data
    return getMockWeather(location, startDate, endDate);
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Generate mock weather data for testing
 */
function getMockWeather(
  location: string,
  startDate: string,
  endDate: string
): WeatherForecast {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const forecast: WeatherData[] = [];

  const conditions = [
    'Sunny',
    'Partly Cloudy',
    'Cloudy',
    'Light Rain',
    'Rain',
    'Clear',
  ];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    forecast.push({
      date: d.toISOString().split('T')[0],
      temperature: {
        high: Math.round(15 + Math.random() * 15),
        low: Math.round(5 + Math.random() * 10),
        unit: 'C',
      },
      conditions: conditions[Math.floor(Math.random() * conditions.length)],
      precipitation: Math.round(Math.random() * 100),
      humidity: Math.round(50 + Math.random() * 40),
    });
  }

  return {
    location,
    startDate,
    endDate,
    forecast,
  };
}
