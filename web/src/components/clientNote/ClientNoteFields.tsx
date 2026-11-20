import { Field, Input, Textarea, TEXTAREA_MAX_LEN } from "../../ui";

export function ClientNoteFields({
  title,
  body,
  onTitle,
  onBody,
}: {
  title: string;
  body: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
}) {
  return (
    <>
      <Field label="Заголовок" as="label">
        <Input
          type="text"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Например, Предпочтения по форме"
          autoComplete="off"
        />
      </Field>

      <Field label="Текст заметки" as="label">
        <Textarea
          rows={5}
          maxLength={TEXTAREA_MAX_LEN}
          value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder="Запишите, что важно помнить об этом клиенте..."
        />
      </Field>
    </>
  );
}
