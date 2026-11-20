/**
 * Note form markup. Run: npx tsx src/components/clientNote/ClientNoteFields.test.tsx
 */
import { renderToStaticMarkup } from "react-dom/server";
import { noteTitleOrDefault } from "../../lib/clientNote.ts";
import { ClientNoteFields } from "./ClientNoteFields.tsx";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(noteTitleOrDefault("  ") === "Заметка", "blank title");
assert(noteTitleOrDefault(" Форма ") === "Форма", "trimmed title");

const html = renderToStaticMarkup(
  <ClientNoteFields
    title="Форма"
    body="текст"
    onTitle={() => undefined}
    onBody={() => undefined}
  />,
);
assert(html.includes("Заголовок"), "title label");
assert(html.includes("Текст заметки"), "body label");
assert(html.includes("Форма"), "title value");
assert(html.includes("текст"), "body value");

console.log("ClientNoteFields.test.tsx: ok");
