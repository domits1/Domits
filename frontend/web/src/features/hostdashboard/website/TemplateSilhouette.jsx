import PropTypes from "prop-types";
import styles from "./WebsiteBuilderPage.module.scss";
import { WEBSITE_TEMPLATE_LAYOUTS } from "./websiteTemplates";

const FEATURE_CARD_IDS = ["trust", "details", "cta"];
const TRUST_CARD_IDS = ["reviews", "policies"];
const JOURNEY_STOP_CONFIG = [
  { id: "arrival", reversed: false },
  { id: "stay", reversed: true },
  { id: "surroundings", reversed: false },
];
const AMENITY_ROW_IDS = ["comfort", "family", "outdoor"];
const AMENITY_PILL_IDS = ["pool", "kitchen", "parking"];
const GALLERY_TILE_IDS = ["hero", "pool", "living", "view", "bedroom", "terrace"];
const QUOTE_SIGNAL_IDS = ["dates", "guests", "price"];
const LOCAL_GUIDE_IDS = ["area", "food", "transport"];
const NAV_DOT_IDS = ["primary", "secondary", "tertiary"];
const TRUST_META_IDS = ["one", "two", "three"];
const RIGHT_META_IDS = ["first", "second"];

function TemplateNavDots() {
  return (
    <div className={styles.templateNavDots}>
      {NAV_DOT_IDS.map((dotId) => (
        <span key={dotId} />
      ))}
    </div>
  );
}

function TemplateRightMeta() {
  return (
    <div className={styles.templateRightMeta}>
      {RIGHT_META_IDS.map((lineId) => (
        <span key={lineId} className={styles.templateTinyLine} />
      ))}
    </div>
  );
}

function TemplateSilhouette({ layout }) {
  switch (layout) {
    case "featureStack":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasFeatureStack}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateNavDots />
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateFeatureStackRow}>
            {FEATURE_CARD_IDS.map((cardId) => (
              <div key={cardId} className={styles.templateFeatureStackCard}>
                <span className={styles.templateMiniIcon} />
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
              </div>
            ))}
          </div>
        </div>
      );
    case "trustSignals":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasTrustSignals}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateRightMeta />
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateTrustStack}>
            {TRUST_CARD_IDS.map((cardId) => (
              <div key={cardId} className={styles.templateTrustCard}>
                <div className={styles.templateTrustMeta}>
                  {TRUST_META_IDS.map((metaId) => (
                    <span key={`${cardId}-${metaId}`} className={styles.templateTinyLine} />
                  ))}
                </div>
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
              </div>
            ))}
          </div>
        </div>
      );
    case "experienceJourney":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasExperienceJourney}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateNavDots />
          </div>
          <div className={styles.templateJourneyStack}>
            {JOURNEY_STOP_CONFIG.map(({ id, reversed }) => (
              <div
                key={id}
                className={`${styles.templateJourneyStop} ${
                  reversed ? styles.templateJourneyStopReverse : ""
                }`}
              >
                {reversed ? (
                  <>
                    <div className={styles.templateJourneyVisual} />
                    <div className={styles.templateJourneyCopy}>
                      <span className={styles.templateLineWide} />
                      <span className={styles.templateLineShort} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.templateJourneyCopy}>
                      <span className={styles.templateLineWide} />
                      <span className={styles.templateLineShort} />
                    </div>
                    <div className={styles.templateJourneyVisual} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case "amenitiesSpotlight":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasAmenitiesSpotlight}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateNavDots />
          </div>
          <div className={styles.templateAmenitiesHero}>
            <div className={styles.templateAmenitiesVisual} />
            <div className={styles.templateAmenitiesList}>
              {AMENITY_ROW_IDS.map((rowId) => (
                <div key={rowId} className={styles.templateAmenityRow}>
                  <span className={styles.templateLineWide} />
                  <span className={styles.templateLineShort} />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.templateAmenitiesFooter}>
            {AMENITY_PILL_IDS.map((pillId) => (
              <div key={pillId} className={styles.templateAmenityPill}>
                <span className={styles.templateTinyLine} />
              </div>
            ))}
          </div>
        </div>
      );
    case "editorial":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasEditorial}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateRightMeta />
          </div>
          <div className={styles.templateEditorialBody}>
            <div className={styles.templateEditorialCopy}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateButtonStub} />
            </div>
            <div className={styles.templateEditorialVisual} />
          </div>
          <div className={styles.templateEditorialFooter}>
            {LOCAL_GUIDE_IDS.map((lineId) => (
              <span key={lineId} className={styles.templateLineShort} />
            ))}
          </div>
        </div>
      );
    case "galleryGrid":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasGalleryGrid}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <span className={styles.templateTinyLine} />
          </div>
          <div className={styles.templateGalleryGrid}>
            {GALLERY_TILE_IDS.map((tileId) => (
              <div key={tileId} className={styles.templateGalleryTile}>
                <div className={styles.templateGalleryVisual} />
                <span className={styles.templateLineShort} />
                <span className={styles.templateTinyLine} />
              </div>
            ))}
          </div>
        </div>
      );
    case "bookingFocus":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasQuoteSpotlight}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateRightMeta />
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateQuoteSpotlightBody}>
            <div className={styles.templateQuoteCopy}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <div className={styles.templateQuoteSignalGroup}>
                {QUOTE_SIGNAL_IDS.map((signalId) => (
                  <span key={signalId} className={styles.templateTinyLine} />
                ))}
              </div>
            </div>
            <div className={styles.templateQuotePanel}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateButtonStub} />
            </div>
          </div>
        </div>
      );
    case "contactFocus":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasContactFocus}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateNavDots />
          </div>
          <div className={styles.templateContactColumns}>
            {["contact", "details"].map((panelId) => (
              <div key={panelId} className={styles.templateContactPanel}>
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
                <span className={panelId === "contact" ? styles.templateLineWide : styles.templateLineShort} />
              </div>
            ))}
          </div>
          <div className={styles.templateContactFooter}>
            <span className={styles.templateButtonStub} />
          </div>
        </div>
      );
    case "localGuide":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasLocalGuide}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <span className={styles.templateTinyLine} />
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateLocalGuideBody}>
            <div className={styles.templateLocalGuideVisual} />
            <div className={styles.templateLocalGuideCopy}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateButtonStub} />
            </div>
          </div>
          <div className={styles.templateLocalGuideFooter}>
            {LOCAL_GUIDE_IDS.map((lineId) => (
              <span key={lineId} className={styles.templateTinyLine} />
            ))}
          </div>
        </div>
      );
    case "panorama":
    default:
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasPanorama}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <TemplateNavDots />
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateSearchStub} />
          <div className={styles.templateFeatureRow}>
            {FEATURE_CARD_IDS.map((cardId) => (
              <div key={cardId} className={styles.templateFeatureCard}>
                <span className={styles.templateMiniIcon} />
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
              </div>
            ))}
          </div>
        </div>
      );
  }
}

TemplateSilhouette.propTypes = {
  layout: PropTypes.oneOf(WEBSITE_TEMPLATE_LAYOUTS).isRequired,
};

export default TemplateSilhouette;
