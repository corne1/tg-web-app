import { useState } from "react";
import { Button } from "../ui/Button";

export type DevAccount = {
  id: number;
  firstName: string;
};

type Props = {
  accounts: DevAccount[];
  onEnter: (id: number, reset: boolean) => Promise<void>;
  onClose: (() => void) | null;
};

export function DevAccountsScreen({ accounts, onEnter, onClose }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(id: number, reset: boolean) {
    setError(null);
    setBusyId(id);
    try {
      await onEnter(id, reset);
    } catch (err) {
      setBusyId(null);
      setError(err instanceof Error ? err.message : "Не удалось войти");
    }
  }

  return (
    <div className={onClose ? "dev-accounts-overlay" : "app-frame"}>
      <main className="dev-accounts">
        <header className="screen-header">
          <h1 className="screen-title">Тестовые учётки</h1>
          <p className="screen-subtitle">
            Локальный вход. «Заново» стирает профиль учётки и открывает
            онбординг с начала. «Продолжить» оставляет текущий шаг.
          </p>
        </header>
        <div className="dev-accounts-list">
          {accounts.map((account) => (
            <section key={account.id} className="dev-account-card">
              <h2 className="dev-account-name">{account.firstName}</h2>
              <div className="dev-account-actions">
                <Button
                  disabled={busyId !== null}
                  onClick={() => void enter(account.id, false)}
                >
                  Продолжить
                </Button>
                <Button
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => void enter(account.id, true)}
                >
                  Заново
                </Button>
              </div>
            </section>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {onClose && (
          <Button variant="outline" disabled={busyId !== null} onClick={onClose}>
            Закрыть
          </Button>
        )}
      </main>
    </div>
  );
}
