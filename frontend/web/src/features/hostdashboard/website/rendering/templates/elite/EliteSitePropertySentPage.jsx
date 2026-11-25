import React from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import styles from "./eliteSitePage.module.scss";
import sentStyles from "./eliteSitePropertySent.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import ElitePageHeader from "./ElitePageHeader";
import EliteFooter from "./EliteFooter";
import { resolveEliteLocation } from "./eliteSitePageContent";
import { resolveHostContactHref } from "../../booking/quoteModel";
import { sitePropertyPagePropType } from "../templatePropTypes";

const NEXT_STEPS = Object.freeze([
  "The host checks your request and accepts or declines it.",
  "If accepted, you get an email with a link to pay.",
  "After payment your stay is confirmed.",
]);

const STAY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

const readText = (value) => (typeof value === "string" ? value.trim() : "");

const readStayDay = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { day, month: MONTH_FORMAT.format(Date.UTC(year, month - 1, day)), year };
};

export const formatSentStay = (checkIn, checkOut) => {
  const start = readStayDay(checkIn);
  const end = readStayDay(checkOut);
  const endText = `${end.day} ${end.month} ${end.year}`;
  if (start.year !== end.year) {
    return `${start.day} ${start.month} ${start.year} to ${endText}`;
  }
  return start.month === end.month ? `${start.day} to ${endText}` : `${start.day} ${start.month} to ${endText}`;
};

export const readSentRequest = (state) => {
  const sentRequest = state?.sentRequest;
  const reference = readText(sentRequest?.reference);
  const checkIn = readText(sentRequest?.checkIn);
  const checkOut = readText(sentRequest?.checkOut);
  const hasStay = STAY_DATE_PATTERN.test(checkIn) && STAY_DATE_PATTERN.test(checkOut);
  return reference && hasStay ? { reference, checkIn, checkOut } : null;
};

function ContactHostLink({ contactHref, whatsappHref }) {
  if (contactHref) {
    return (
      <PanoramaPageLink href={contactHref} className={sentStyles.secondaryButton}>
        Contact the host
      </PanoramaPageLink>
    );
  }
  return whatsappHref ? (
    <a href={whatsappHref} className={sentStyles.secondaryButton} target="_blank" rel="noreferrer">
      Contact the host
    </a>
  ) : null;
}

ContactHostLink.propTypes = {
  contactHref: PropTypes.string.isRequired,
  whatsappHref: PropTypes.string,
};

export default function EliteSitePropertySentPage({ sitePropertyPage, headerTone, model, viewState, headerRef }) {
  const { state } = useLocation();
  const sentRequest = readSentRequest(state);
  const { title, overviewHref, propertyHref, contactHref } = sitePropertyPage;
  const location = resolveEliteLocation(model);
  const stayText = sentRequest ? formatSentStay(sentRequest.checkIn, sentRequest.checkOut) : "";

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page="sent">
      <ElitePageHeader
        title={sentRequest ? "Your request has been sent" : "No request to show"}
        eyebrow={
          <>
            <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
              Our properties
            </PanoramaPageLink>
            {" / "}
            <PanoramaPageLink href={propertyHref} className={styles.eliteCrumbLink}>
              {title}
            </PanoramaPageLink>
          </>
        }
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
      />
      <section className={`${styles.eliteSection} ${sentStyles.sent}`}>
        {sentRequest ? (
          <div className={`${styles.elitePriceCard} ${sentStyles.card}`} role="status">
            <svg className={sentStyles.check} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <circle cx="24" cy="24" r="22" />
              <path d="M14 25l7 7 13-15" />
            </svg>
            <p className={sentStyles.lead}>
              {`The host of ${title} has your request for ${stayText}. You have not paid anything yet.`}
            </p>
            <ol className={sentStyles.steps}>
              {NEXT_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className={sentStyles.reference}>
              <span>Booking reference</span>
              <strong>{sentRequest.reference}</strong>
            </p>
          </div>
        ) : (
          <p className={sentStyles.lead}>
            This page shows a request only right after you send it. If you sent one, the email we sent you has the
            details.
          </p>
        )}
        <div className={sentStyles.actions}>
          <PanoramaPageLink href={overviewHref} className={styles.eliteButton}>
            Back to our properties
          </PanoramaPageLink>
          {sentRequest ? (
            <ContactHostLink contactHref={contactHref} whatsappHref={resolveHostContactHref(model)} />
          ) : (
            <PanoramaPageLink href={propertyHref} className={sentStyles.secondaryButton}>
              {`Back to ${title}`}
            </PanoramaPageLink>
          )}
        </div>
      </section>
      <EliteFooter title={model.site.title} location={location} />
    </div>
  );
}

EliteSitePropertySentPage.propTypes = {
  sitePropertyPage: sitePropertyPagePropType.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({
    site: PropTypes.shape({ title: PropTypes.string }).isRequired,
    media: PropTypes.object.isRequired,
    host: PropTypes.object,
  }).isRequired,
  viewState: PropTypes.shape({ showTopBar: PropTypes.bool.isRequired }).isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
};
