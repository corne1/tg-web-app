import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCabinetClients } from "../api";
import plusWhiteIcon from "../assets/cabinet/plus-white.svg";
import { ClientsListSkeleton, Skeleton } from "../components/calendar/Skeleton";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  clientInitial,
  clientListMeta,
  filterBookingClients,
  pluralClients,
  pluralVisits,
  sortClientsAlphabetical,
  type BookingClient,
} from "../lib/bookingClients";
import { ChevronRightIcon, cx } from "../ui";

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.75" stroke="#9196A1" strokeWidth="1.5" />
      <path
        d="M13.5 13.5 17 17"
        stroke="#9196A1"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma 21317:15642 — список «Клиенты». */
export function ClientsScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [allClients, setAllClients] = useState<BookingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCabinetClients();
        if (!cancelled) setAllClients(data.clients);
      } catch (err) {
        if (!cancelled) {
          setAllClients([]);
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clients = useMemo(() => {
    const filtered = filterBookingClients(allClients, query);
    return sortClientsAlphabetical(filtered);
  }, [allClients, query]);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const emptyCopy =
    allClients.length === 0 && !query.trim()
      ? {
          title: "Пока нет клиентов",
          sub: "Клиенты появятся после записей или добавления вручную",
        }
      : {
          title: "Клиенты не найдены",
          sub: "Измените запрос или добавьте нового клиента",
        };

  return (
    <div className="master-setup ms-cabinet">
      <header className="ms-cab-header">
        <h1 className="ms-cab-title">Клиенты</h1>
        <button
          type="button"
          className="ms-cab-add"
          aria-label="Добавить клиента"
          onClick={() => navigate("/cabinet/clients/new")}
        >
          <img src={plusWhiteIcon} width={20} height={20} alt="" />
        </button>
      </header>

      <div className="ms-body ms-cab-body ms-cl-body">
        <label className="ms-field ms-cl-search-field">
          <span className="ms-nb-search">
            <SearchIcon />
            <input
              className="ms-input ms-nb-search-input"
              type="search"
              placeholder="Имя или номер телефона"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </span>
        </label>

        <div className="ms-cl-list-head">
          <h2 className="ms-cl-list-title">Все клиенты</h2>
          {loading ? (
            <Skeleton width="72px" height="14px" />
          ) : (
            <p className="ms-cl-list-count">
              {clients.length} {pluralClients(clients.length)}
            </p>
          )}
        </div>

        {loading ? (
          <ClientsListSkeleton />
        ) : error ? (
          <p className="ms-footer-error">{error}</p>
        ) : clients.length === 0 ? (
          <div className="ms-cab-empty-card">
            <div className="ms-cab-empty-copy">
              <p className="ms-cab-empty-title">{emptyCopy.title}</p>
              <p className="ms-cab-empty-sub">{emptyCopy.sub}</p>
            </div>
          </div>
        ) : (
          <ul className="ms-cl-list">
            {clients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className="ms-cl-row"
                  onClick={() => navigate(`/cabinet/clients/${client.id}`)}
                >
                  <span
                    className={cx("ms-nb-avatar", `tone-${client.avatarTone}`)}
                    aria-hidden
                  >
                    {clientInitial(client.name)}
                  </span>
                  <span className="ms-cl-row-copy">
                    <span className="ms-cl-row-name">{client.name}</span>
                    <span className="ms-cl-row-meta">{clientListMeta(client)}</span>
                    {client.visits > 0 && !client.nextBooking ? (
                      <span className="ms-cl-row-sub">
                        {client.visits} {pluralVisits(client.visits)}
                      </span>
                    ) : null}
                  </span>
                  <span className="ms-cl-row-chevron" aria-hidden>
                    <ChevronRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MasterTabBar />
    </div>
  );
}
