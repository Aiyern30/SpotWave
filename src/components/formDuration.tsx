export const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000); // Convert milliseconds to seconds
  const hours = Math.floor(totalSeconds / 3600); // Calculate total hours
  const minutes = Math.floor((totalSeconds % 3600) / 60); // Calculate remaining minutes
  const seconds = totalSeconds % 60; // Calculate remaining seconds

  // Format the output string, ensuring two digits for minutes and seconds
  return `${hours}h ${minutes}m ${seconds}s`;
};
