export const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};

export const formatSongDuration = (durationMs: number | undefined) => {
  if (durationMs === undefined) return "00:00";

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

export const formatLyrics = (lyrics: string | null) => {
  if (!lyrics) return null;
  return lyrics.split("\n").map((line, index) => <p key={index}>{line}</p>);
};

export const transform = (node: any) => {
  if (node.type === "tag" && node.name === "a") {
    node.attribs.class = "text-blue-500 underline hover:text-blue-700";
  }
  return node;
};
