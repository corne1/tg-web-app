export function noteTitleOrDefault(title: string): string {
  const trimmed = title.trim();
  return trimmed || "Заметка";
}
