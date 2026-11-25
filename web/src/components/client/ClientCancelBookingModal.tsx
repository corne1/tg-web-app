import { Button, Modal } from "../../ui";

/** Figma 21477:21366 — centered cancel confirmation dialog. */
function CancelWarnIcon() {
  return (
    <svg
      className="ms-modal-warn-icon"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="#f53d3d"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClientCancelBookingModal({
  open,
  onClose,
  onConfirm,
  busy,
  dateLabel,
  timeLabel,
  serviceTitles,
  masterName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  dateLabel: string;
  timeLabel: string;
  serviceTitles: string[];
  masterName: string;
}) {
  const when = [dateLabel, timeLabel].filter(Boolean).join(" · ") || "—";
  const services = serviceTitles.filter(Boolean).join(" · ");

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="client-cancel-title"
      className="ms-modal-dialog ms-client-cancel-modal"
    >
      <div className="ms-modal-header">
        <div className="ms-modal-warn" aria-hidden>
          <CancelWarnIcon />
        </div>
        <div className="ms-modal-copy">
          <h3 id="client-cancel-title">Отменить запись?</h3>
          <p>После отмены запись перестанет быть активной</p>
        </div>
      </div>

      <div className="ms-client-cancel-summary">
        <p className="ms-client-cancel-summary-when">{when}</p>
        {services ? (
          <p className="ms-client-cancel-summary-svc">{services}</p>
        ) : null}
        {masterName ? (
          <p className="ms-client-cancel-summary-master">
            Мастер {masterName}
          </p>
        ) : null}
      </div>

      <div className="ms-modal-actions">
        <Button
          variant="danger"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Отменяем…" : "Да, отменить запись"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Оставить запись
        </Button>
      </div>
    </Modal>
  );
}
