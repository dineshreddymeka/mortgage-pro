/** Build a viewer URL for an immutable share token (hash route). */
export function buildShareViewerUrl(token: string, origin = window.location.origin): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const path = base.startsWith("http") ? base : `${origin}${base}`;
  return `${path.replace(/\/$/, "")}#/share/${encodeURIComponent(token.trim())}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
