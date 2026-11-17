import React, { useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import IntegrationCard from "./IntegrationCard";
import { ALL_OPTION, filterIntegrations, hasActiveFilters, optionsFor } from "../utils/integrationFilters";

const NO_FILTERS = Object.freeze({ query: "", category: ALL_OPTION, status: ALL_OPTION });

const resultCountText = (count, texts) =>
  (count === 1 ? texts.resultCountOne : texts.resultCountOther).replace("{count}", String(count));

function FilterSelect({ id, label, allLabel, value, options, optionLabels, onChange }) {
  return (
    <div className="host-integrations-market-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL_OPTION}>{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

FilterSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  allLabel: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionLabels: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function IntegrationMarketplace({ integrations, texts }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const searchRef = useRef(null);
  const idPrefix = useId();
  const visible = filterIntegrations(integrations, filters);

  const setFilter = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));

  const clearFilters = () => {
    setFilters(NO_FILTERS);
    searchRef.current?.focus();
  };

  return (
    <section className="host-integrations-market">
      <form
        className="host-integrations-market-filters"
        role="search"
        aria-label={texts.filtersLabel}
        onSubmit={(event) => event.preventDefault()}>
        <div className="host-integrations-market-field is-search">
          <label htmlFor={`${idPrefix}-search`}>{texts.searchLabel}</label>
          <input
            ref={searchRef}
            id={`${idPrefix}-search`}
            type="search"
            value={filters.query}
            placeholder={texts.searchPlaceholder}
            autoComplete="off"
            onChange={(event) => setFilter("query")(event.target.value)}
          />
        </div>
        <FilterSelect
          id={`${idPrefix}-category`}
          label={texts.categoryLabel}
          allLabel={texts.allCategories}
          value={filters.category}
          options={optionsFor(integrations, "category")}
          optionLabels={texts.categories}
          onChange={setFilter("category")}
        />
        <FilterSelect
          id={`${idPrefix}-status`}
          label={texts.statusLabel}
          allLabel={texts.allStatuses}
          value={filters.status}
          options={optionsFor(integrations, "status")}
          optionLabels={texts.statuses}
          onChange={setFilter("status")}
        />
      </form>

      <p className="host-integrations-market-count" role="status">
        {resultCountText(visible.length, texts)}
      </p>

      {visible.length > 0 ? (
        <ul className="host-integrations-market-grid" aria-label={texts.listLabel}>
          {visible.map((integration) => (
            <li key={integration.id}>
              <IntegrationCard integration={integration} texts={texts} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="host-integrations-market-empty">
          <h2>{texts.emptyTitle}</h2>
          <p>{texts.emptyText}</p>
          {hasActiveFilters(filters) && (
            <button type="button" className="host-integrations-market-action" onClick={clearFilters}>
              {texts.clearFilters}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

IntegrationMarketplace.propTypes = {
  integrations: PropTypes.arrayOf(PropTypes.object).isRequired,
  texts: PropTypes.object.isRequired,
};
