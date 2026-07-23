const MAX_TITLE = 200;
const MAX_EXCERPT = 500;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  if (!match?.[1]) return undefined;
  return stripTags(match[1]).replace(/\s+/g, " ").trim();
}

function trimTo(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/** Parse common HTML metadata without executing scripts or loading external resources. */
export function extractPageMetadata(html: string): { title?: string; excerpt?: string } {
  const title =
    firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
    firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

  const excerpt =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ??
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

  if (excerpt) {
    return {
      title: trimTo(title, MAX_TITLE),
      excerpt: trimTo(excerpt, MAX_EXCERPT),
    };
  }

  const paragraph = firstMatch(html, /<p[^>]*>([\s\S]{20,800}?)<\/p>/i);
  return {
    title: trimTo(title, MAX_TITLE),
    excerpt: trimTo(paragraph, MAX_EXCERPT),
  };
}

export function extractJsonFieldText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}
