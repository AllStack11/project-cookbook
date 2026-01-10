/**
 * Formats a duration in minutes into a human-readable string.
 * Examples: 45 -> "45m", 75 -> "1h 15m", 120 -> "2h"
 */
export function formatMinutes(minutes: number | undefined): string {
  if (minutes === undefined || minutes === null || minutes <= 0) {
    return "";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `\${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `\${hours}h`;
  }

  return `\${hours}h \${remainingMinutes}m`;
}
