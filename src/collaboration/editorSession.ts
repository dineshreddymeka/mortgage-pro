const EDITOR_SESSION_KEY = "mortgage-pro:editor-session";

export function getEditorSessionId(): string {
  try {
    let id = sessionStorage.getItem(EDITOR_SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(EDITOR_SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}
