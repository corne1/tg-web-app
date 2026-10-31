import { BackIcon, CloseIcon } from "./icons";
import { IconButton } from "./IconButton";

export function SheetHeader({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="ms-sheet-toolbar">
      <div className="ms-sheet-grabber" aria-hidden />
      <div className="ms-sheet-toolbar-row">
        {onBack ? (
          <IconButton
            label="Назад"
            className="ms-sheet-icon-btn"
            onClick={onBack}
          >
            <BackIcon />
          </IconButton>
        ) : (
          <span className="ms-sheet-toolbar-side" aria-hidden />
        )}
        <h3 className="ms-sheet-toolbar-title">{title}</h3>
        <IconButton
          label="Закрыть"
          className="ms-sheet-icon-btn"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  );
}
