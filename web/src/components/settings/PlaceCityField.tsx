import type { CityHit } from "../../api";
import { Field, Input, cx } from "../../ui";
import { IconMapPinSmall, IconSearch } from "./PlaceSettingsParts";

export function PlaceCityField({
  query,
  committedCity,
  hasError,
  open,
  loading,
  suggestions,
  onQueryChange,
  onFocus,
  onBlur,
  onSelect,
}: {
  query: string;
  committedCity: string;
  hasError: boolean;
  open: boolean;
  loading: boolean;
  suggestions: CityHit[];
  onQueryChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: (hit: CityHit) => void;
}) {
  const showSuggestions = open && query.trim().length > 0 && !hasError;
  const showEmptyError = hasError && query.trim().length > 0;

  return (
    <Field label="Город" className="ms-city-field">
      <div
        className={cx(
          "ms-input-affix",
          "ms-input-affix-prefix",
          "ms-city-input-wrap",
          hasError && "is-invalid",
          open && "is-open",
        )}
      >
        <span className="ms-affix ms-affix-icon" aria-hidden>
          <IconSearch />
        </span>
        <Input
          className="ms-input-search"
          invalid={hasError}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Начните вводить название города"
          autoComplete="off"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="ms-city-suggest" role="listbox">
          {suggestions.map((hit) => (
            <li key={`${hit.name}-${hit.region ?? ""}`}>
              <button
                type="button"
                className="ms-city-suggest-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(hit)}
              >
                <IconMapPinSmall />
                <span className="ms-city-suggest-text">
                  <span className="ms-city-suggest-name">{hit.name}</span>
                  {hit.region && (
                    <span className="ms-city-suggest-region">{hit.region}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && !loading && suggestions.length === 0 && query.trim().length > 0 && (
        <div className="ms-city-miss" role="status">
          <IconMapPinSmall />
          <div>
            <p className="ms-city-miss-title">Город не найден</p>
            <p className="ms-city-miss-text">
              Попробуйте изменить запрос или проверьте написание
            </p>
          </div>
        </div>
      )}

      {showEmptyError && (
        <div className="ms-city-miss" role="alert">
          <IconMapPinSmall />
          <div>
            <p className="ms-city-miss-title">Город не найден</p>
            <p className="ms-city-miss-text">
              Попробуйте изменить запрос или проверьте написание
            </p>
          </div>
        </div>
      )}

      {committedCity && !open && !hasError && (
        <span className="ms-sr-only">Выбран город {committedCity}</span>
      )}
    </Field>
  );
}
