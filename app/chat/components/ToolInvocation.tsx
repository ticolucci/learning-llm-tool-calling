/**
 * ToolInvocation Component - Displays LLM tool calls in real-time
 *
 * Session 5: Stream Tool Invocations to Frontend
 *
 * This component visualizes when the AI is calling tools and displays
 * the tool parameters and results.
 */

interface ToolInvocationProps {
  toolName: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export function ToolInvocation({
  toolName,
  state,
  input,
  output,
  errorText,
}: ToolInvocationProps) {
  // Determine the display state
  const isLoading = state === 'input-streaming';
  const hasError = state === 'output-error';
  const isComplete = state === 'output-available';

  // Get tool-specific UI
  const getToolDisplay = () => {
    if (toolName === 'get_weather') {
      return {
        icon: '🌤️',
        title: 'Checking Weather',
        loadingMessage: 'Fetching weather forecast...',
      };
    }

    // Default for unknown tools
    return {
      icon: '🛠️',
      title: `Calling ${toolName}`,
      loadingMessage: 'Executing tool...',
    };
  };

  const display = getToolDisplay();

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{display.icon}</span>
          <h4 className="font-semibold text-purple-900 dark:text-purple-100">
            {display.title}
          </h4>
          {isLoading && (
            <div className="ml-2">
              <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Show input parameters */}
        {input && typeof input === 'object' && Object.keys(input).length > 0 && (
          <div className="mt-2 text-sm">
            <div className="text-purple-700 dark:text-purple-300 font-medium mb-1">
              Parameters:
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-2 font-mono text-xs">
              {Object.entries(input as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-purple-600 dark:text-purple-400">{key}:</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="mt-2 text-sm text-purple-600 dark:text-purple-400">
            {display.loadingMessage}
          </div>
        )}

        {/* Error state */}
        {hasError && errorText && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span> {errorText}
          </div>
        )}

        {/* Success state with output */}
        {isComplete && output && (
          <div className="mt-2 text-sm">
            <div className="text-green-700 dark:text-green-300 font-medium mb-1">
              ✓ Complete
            </div>
            {toolName === 'get_weather' && <WeatherOutput data={output} />}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Weather-specific output display
 */
function WeatherOutput({ data }: { data: unknown }) {
  // Type guard for weather data
  if (!data || typeof data !== 'object') {
    return <div className="text-gray-600 dark:text-gray-400">No weather data available</div>;
  }

  const weatherData = data as {
    location?: string;
    forecast?: Array<{
      date: string;
      temperature: { high: number; low: number };
      condition: string;
    }>;
  };

  if (!weatherData.location || !weatherData.forecast) {
    return <div className="text-gray-600 dark:text-gray-400">Invalid weather data format</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded p-3 mt-2">
      <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
        {weatherData.location}
      </div>
      <div className="space-y-2">
        {weatherData.forecast.map((day) => (
          <div key={day.date} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{day.date}</span>
            <span className="text-gray-700 dark:text-gray-300">{day.condition}</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {day.temperature.high}°/{day.temperature.low}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
