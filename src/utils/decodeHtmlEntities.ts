const htmlEntityPattern = /&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|#39|nbsp);/gi;

export function decodeHtmlEntities(value: string): string {
  return value.replace(htmlEntityPattern, (match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos" || normalized === "#39") return "'";
    if (normalized === "nbsp") return " ";

    const codePoint = normalized.startsWith("#x")
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10);

    return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
  });
}
