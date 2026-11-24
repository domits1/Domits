import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import PanoramaPageLink from "../PanoramaPageLink";
import { resolveQuotePanelSiteId } from "../../booking/quotePanelGate";
import { resolveQuoteErrorPresentation } from "../../booking/quoteErrorCopy";
import { formatMinorUnits, formatStayDate, getTodayDateKey } from "../../booking/quoteSelection";
import { SITE_PROPERTY_SEARCH_STATUS, useSitePropertySearch } from "../../booking/useSitePropertySearch";
import { getOrCreateVisitorId } from "../../../services/websiteVisitorId";
import { MAIN_SITE_PAGE_KEY, buildSitePageHref, listSitePageMenuItems } from "../../websitePages";
import { buildSitePropertyHref } from "../../websiteSiteProperties";
import {
  MAX_SITE_PROPERTY_SEARCH_GUESTS,
  buildSitePropertyCards,
  buildSitePropertyStayQuery,
  countSearchNights,
  describeSitePropertyCard,
  formatCount,
  groupSitePropertySearchResults,
  listSitePropertyCities,
  validateSitePropertySearch,
} from "../../websiteSitePropertySearch";
import styles from "./eliteSitePropertiesHome.module.scss";

const ALL_CITIES = Object.freeze({ key: "", label: "All" });

function SearchForm({ isSearching, onSearch }) {
  const todayKey = getTodayDateKey();
  const [stay, setStay] = useState({ checkIn: "", checkOut: "", guests: "2" });
  const [problem, setProblem] = useState("");
  const fields = [
    { field: "checkIn", label: "Check in", type: "date", min: todayKey },
    { field: "checkOut", label: "Check out", type: "date", min: stay.checkIn || todayKey },
    { field: "guests", label: "Guests", type: "number", min: 1, max: MAX_SITE_PROPERTY_SEARCH_GUESTS },
  ];

  const handleSubmit = (event) => {
    event.preventDefault();
    const criteria = { ...stay, guests: Number(stay.guests) };
    const nextProblem = validateSitePropertySearch(criteria, getTodayDateKey());
    setProblem(nextProblem);
    if (!nextProblem) {
      onSearch(criteria);
    }
  };

  return (
    <form className={styles.eliteHomeSearch} onSubmit={handleSubmit} noValidate aria-label="Search by dates">
      {fields.map(({ field, label, ...input }) => (
        <label key={field} className={styles.eliteHomeField}>
          {label}
          <input
            {...input}
            value={stay[field]}
            onChange={(event) => setStay((current) => ({ ...current, [field]: event.target.value }))}
          />
        </label>
      ))}
      <button type="submit" className={styles.eliteHomeButton}>
        {isSearching ? "Searching" : "Show available"}
      </button>
      {problem ? <p role="alert">{problem}</p> : null}
    </form>
  );
}

SearchForm.propTypes = { isSearching: PropTypes.bool.isRequired, onSearch: PropTypes.func.isRequired };

const renderPropertyCard = (card, href, price = "") => (
  <PanoramaPageLink key={card.propertyId} href={href} className={styles.eliteHomeCard}>
    {card.imageUrl ? <img src={card.imageUrl} alt={card.title} loading="lazy" /> : null}
    <span className={styles.eliteHomeCardTitle}>{card.title}</span>
    <span className={styles.eliteHomeMuted}>{describeSitePropertyCard(card)}</span>
    {price ? <strong className={styles.eliteHomePrice}>{price}</strong> : null}
  </PanoramaPageLink>
);

const renderSearchResults = ({ cards, search, pageBasePath, pageSearch }) => {
  const { criteria } = search;
  const { free, notFree, failed } = groupSitePropertySearchResults(cards, search.answers, criteria);
  const answered = formatCount(free.length + notFree.length + failed.length, "property", "properties");
  const nights = formatCount(countSearchNights(criteria.checkIn, criteria.checkOut), "night");
  const stayHrefSearch = buildSitePropertyStayQuery(pageSearch, criteria);
  const heading = free.length > 0 && `${free.length} of ${answered} ${free.length === 1 ? "is" : "are"} free`;
  const emptyHeading = failed.length ? "Not all prices could be loaded" : "No property is free for this stay";

  return (
    <section className={styles.eliteHomeSection} aria-label="Search results">
      <h2 className={styles.eliteHomeHeading}>{heading || emptyHeading}</h2>
      <p className={styles.eliteHomeMuted}>
        {`${formatStayDate(criteria.checkIn)} to ${formatStayDate(criteria.checkOut)} · ${nights} · `}
        {`${formatCount(criteria.guests, "guest")}. Prices are for the whole stay.`}
      </p>
      <button type="button" className={styles.eliteHomeTextButton} onClick={search.clearSearch}>
        Show all properties
      </button>
      <div className={styles.eliteHomeGrid}>
        {free.map(({ card, quote }) =>
          renderPropertyCard(
            card,
            buildSitePropertyHref(pageBasePath, card.slug, undefined, stayHrefSearch),
            `${formatMinorUnits(quote.priceBreakdown.total, quote.priceBreakdown.currency)} for ${nights}`
          )
        )}
      </div>
      {notFree.map(({ card, reason }) => (
        <p key={card.propertyId} className={styles.eliteHomeNotFree}>
          <strong>{card.title}</strong> {reason}
        </p>
      ))}
      {failed.length ? (
        <p className={styles.eliteHomeNotFree} role="alert">
          {`The price could not be loaded for ${failed.map((card) => card.title).join(", ")}. `}
          <button type="button" className={styles.eliteHomeTextButton} onClick={() => search.runSearch(criteria)}>
            Try again
          </button>
        </p>
      ) : null}
    </section>
  );
};

export default function EliteSitePropertiesHome({
  siteModel,
  siteProperties,
  contentOverrides,
  themeOverrides,
  templateKey,
  siteId,
  pageBasePath,
  pageSearch,
}) {
  const cards = useMemo(
    () => buildSitePropertyCards({ siteModel, siteProperties, contentOverrides, themeOverrides, templateKey }),
    [contentOverrides, siteModel, siteProperties, templateKey, themeOverrides]
  );
  const propertyIds = useMemo(() => cards.map((card) => card.propertyId), [cards]);
  const sessionId = useMemo(() => getOrCreateVisitorId(), []);
  const [cityKey, setCityKey] = useState(ALL_CITIES.key);
  const cities = listSitePropertyCities(cards);
  const searchSiteId = resolveQuotePanelSiteId({ quoteContext: { siteId }, model: siteModel });
  const search = useSitePropertySearch({ siteId: searchSiteId, propertyIds, sessionId });
  const headerPhoto = cards.find((card) => card.imageUrl)?.imageUrl;

  return (
    <main className={styles.eliteHome}>
      <header className={styles.eliteHomeHeader}>
        {headerPhoto ? <img className={styles.eliteHomeHeaderImage} src={headerPhoto} alt="" /> : null}
        <nav className={styles.eliteHomeNav} aria-label="Site menu">
          <PanoramaPageLink href={buildSitePageHref(pageBasePath, MAIN_SITE_PAGE_KEY, pageSearch)}>
            {siteModel.site.title}
          </PanoramaPageLink>
          {listSitePageMenuItems(siteModel.sitePages)
            .slice(1)
            .map((item) => (
              <PanoramaPageLink key={item.key} href={buildSitePageHref(pageBasePath, item.key, pageSearch)}>
                {item.navLabel}
              </PanoramaPageLink>
            ))}
        </nav>
        <div className={styles.eliteHomeIntro}>
          <p className={styles.eliteHomeEyebrow}>{formatCount(cards.length, "property", "properties")}</p>
          <h1 className={styles.eliteHomeTitle}>Our properties</h1>
          {searchSiteId ? (
            <SearchForm
              isSearching={search.status === SITE_PROPERTY_SEARCH_STATUS.LOADING}
              onSearch={search.runSearch}
            />
          ) : null}
        </div>
      </header>
      {search.status === SITE_PROPERTY_SEARCH_STATUS.DONE ? (
        renderSearchResults({ cards, search, pageBasePath, pageSearch })
      ) : (
        <section className={styles.eliteHomeSection} aria-label="All properties">
          {search.status === SITE_PROPERTY_SEARCH_STATUS.FAILED ? (
            <p role="alert">{resolveQuoteErrorPresentation(search.error).message}</p>
          ) : null}
          {cities.length > 1 ? (
            <div className={styles.eliteHomeChips} role="group" aria-label="Filter by location">
              {[ALL_CITIES, ...cities].map((city) => (
                <button
                  key={city.key}
                  type="button"
                  aria-pressed={cityKey === city.key}
                  onClick={() => setCityKey(city.key)}>
                  {city.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.eliteHomeGrid}>
            {cards
              .filter((card) => !cityKey || card.city.toLowerCase() === cityKey)
              .map((card) =>
                renderPropertyCard(card, buildSitePropertyHref(pageBasePath, card.slug, undefined, pageSearch))
              )}
          </div>
        </section>
      )}
    </main>
  );
}

EliteSitePropertiesHome.propTypes = {
  siteModel: PropTypes.shape({ site: PropTypes.shape({ title: PropTypes.string }).isRequired }).isRequired,
  siteProperties: PropTypes.arrayOf(PropTypes.shape({ propertyId: PropTypes.string.isRequired })).isRequired,
  contentOverrides: PropTypes.objectOf(PropTypes.any),
  themeOverrides: PropTypes.objectOf(PropTypes.any),
  templateKey: PropTypes.string.isRequired,
  siteId: PropTypes.string.isRequired,
  pageBasePath: PropTypes.string.isRequired,
  pageSearch: PropTypes.string.isRequired,
};
