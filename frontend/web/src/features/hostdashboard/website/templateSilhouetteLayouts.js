import styles from "./WebsiteBuilderPage.module.scss";

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

function FeatureStackLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateNavDots />
      </div>
      <div {...getTargetProps("hero", styles.templateHeroBand)} />
      <div className={styles.templateFeatureStackRow}>
        {FEATURE_CARD_IDS.map((cardId) => (
          <div key={cardId} className={styles.templateFeatureStackCard}>
            <span
              className={
                cardId === "details"
                  ? getTargetProps("details-icon", styles.templateMiniIcon).className
                  : styles.templateMiniIcon
              }
            />
            <span className={styles.templateLineWide} />
            <span
              className={
                cardId === "cta"
                  ? getTargetProps("cta-line", styles.templateLineShort).className
                  : styles.templateLineShort
              }
            />
          </div>
        ))}
      </div>
    </>
  );
}

function TrustSignalsLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateRightMeta />
      </div>
      <div {...getTargetProps("hero", styles.templateHeroBand)} />
      <div className={styles.templateTrustStack}>
        {TRUST_CARD_IDS.map((cardId) => (
          <div
            key={cardId}
            {...getTargetProps(cardId === "reviews" ? "trust-reviews" : "trust-policies", styles.templateTrustCard)}
          >
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
    </>
  );
}

function ExperienceJourneyLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateNavDots />
      </div>
      <div className={styles.templateJourneyStack}>
        {JOURNEY_STOP_CONFIG.map(({ id, reversed }) => (
          <div
            key={id}
            className={`${styles.templateJourneyStop} ${reversed ? styles.templateJourneyStopReverse : ""}`}
          >
            {reversed ? (
              <>
                <div {...getTargetProps("stay-visual", styles.templateJourneyVisual)} />
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
                <div
                  {...getTargetProps(
                    id === "arrival" ? "arrival-visual" : "surroundings-visual",
                    styles.templateJourneyVisual
                  )}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function AmenitiesSpotlightLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateNavDots />
      </div>
      <div className={styles.templateAmenitiesHero}>
        <div {...getTargetProps("amenities-visual", styles.templateAmenitiesVisual)} />
        <div className={styles.templateAmenitiesList}>
          {AMENITY_ROW_IDS.map((rowId) => (
            <div
              key={rowId}
              {...getTargetProps(
                rowId === "comfort" ? "amenity-comfort" : `amenity-${rowId}`,
                styles.templateAmenityRow
              )}
            >
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.templateAmenitiesFooter}>
        {AMENITY_PILL_IDS.map((pillId) => (
          <div
            key={pillId}
            {...getTargetProps(
              pillId === "kitchen" ? "amenity-kitchen" : `amenity-pill-${pillId}`,
              styles.templateAmenityPill
            )}
          >
            <span className={styles.templateTinyLine} />
          </div>
        ))}
      </div>
    </>
  );
}

function EditorialLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateRightMeta />
      </div>
      <div className={styles.templateEditorialBody}>
        <div className={styles.templateEditorialCopy}>
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineShort} />
          <span {...getTargetProps("primary-cta", styles.templateButtonStub)} />
        </div>
        <div {...getTargetProps("editorial-visual", styles.templateEditorialVisual)} />
      </div>
      <div className={styles.templateEditorialFooter}>
        {LOCAL_GUIDE_IDS.map((lineId) => (
          <span
            key={lineId}
            {...getTargetProps(lineId === "food" ? "footer-food" : `footer-${lineId}`, styles.templateLineShort)}
          />
        ))}
      </div>
    </>
  );
}

function GalleryGridLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <span className={styles.templateTinyLine} />
      </div>
      <div className={styles.templateGalleryGrid}>
        {GALLERY_TILE_IDS.map((tileId) => (
          <div key={tileId} className={styles.templateGalleryTile}>
            <div {...getTargetProps(`gallery-${tileId}`, styles.templateGalleryVisual)} />
            <span className={styles.templateLineShort} />
            <span className={styles.templateTinyLine} />
          </div>
        ))}
      </div>
    </>
  );
}

function BookingFocusLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateRightMeta />
      </div>
      <div {...getTargetProps("hero", styles.templateHeroBand)} />
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
        <div {...getTargetProps("quote-panel", styles.templateQuotePanel)}>
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineShort} />
          <span className={styles.templateLineShort} />
          <span {...getTargetProps("quote-cta", styles.templateButtonStub)} />
        </div>
      </div>
    </>
  );
}

function ContactFocusLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateNavDots />
      </div>
      <div className={styles.templateContactColumns}>
        <div {...getTargetProps("contact-panel", styles.templateContactPanel)}>
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineShort} />
          <span className={styles.templateLineWide} />
        </div>
        <div {...getTargetProps("details-panel", styles.templateContactPanel)}>
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineShort} />
          <span className={styles.templateLineShort} />
        </div>
      </div>
      <div className={styles.templateContactFooter}>
        <span {...getTargetProps("contact-cta", styles.templateButtonStub)} />
      </div>
    </>
  );
}

function LocalGuideLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <span className={styles.templateTinyLine} />
      </div>
      <div {...getTargetProps("hero", styles.templateHeroBand)} />
      <div className={styles.templateLocalGuideBody}>
        <div {...getTargetProps("local-visual", styles.templateLocalGuideVisual)} />
        <div className={styles.templateLocalGuideCopy}>
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineWide} />
          <span className={styles.templateLineShort} />
          <span {...getTargetProps("local-cta", styles.templateButtonStub)} />
        </div>
      </div>
      <div className={styles.templateLocalGuideFooter}>
        {LOCAL_GUIDE_IDS.map((lineId) => (
          <span key={lineId} className={styles.templateTinyLine} />
        ))}
      </div>
    </>
  );
}

function PanoramaLayout({ getTargetProps }) {
  return (
    <>
      <div className={styles.templateChrome}>
        <span className={styles.templateBrandMark} />
        <TemplateNavDots />
      </div>
      <div {...getTargetProps("hero", styles.templateHeroBand)} />
      <div {...getTargetProps("search", styles.templateSearchStub)} />
      <div className={styles.templateFeatureRow}>
        {FEATURE_CARD_IDS.map((cardId) => (
          <div key={cardId} className={styles.templateFeatureCard}>
            <span
              {...getTargetProps(
                cardId === "details" ? "details-card" : `feature-${cardId}`,
                styles.templateMiniIcon
              )}
            />
            <span className={styles.templateLineWide} />
            <span className={styles.templateLineShort} />
          </div>
        ))}
      </div>
    </>
  );
}

export const TEMPLATE_SILHOUETTE_LAYOUTS = {
  panorama: {
    canvasClassName: styles.templateCanvasPanorama,
    Component: PanoramaLayout,
  },
  trustSignals: {
    canvasClassName: styles.templateCanvasTrustSignals,
    Component: TrustSignalsLayout,
  },
  experienceJourney: {
    canvasClassName: styles.templateCanvasExperienceJourney,
    Component: ExperienceJourneyLayout,
  },
  amenitiesSpotlight: {
    canvasClassName: styles.templateCanvasAmenitiesSpotlight,
    Component: AmenitiesSpotlightLayout,
  },
  galleryGrid: {
    canvasClassName: styles.templateCanvasGalleryGrid,
    Component: GalleryGridLayout,
  },
  editorial: {
    canvasClassName: styles.templateCanvasEditorial,
    Component: EditorialLayout,
  },
  bookingFocus: {
    canvasClassName: styles.templateCanvasQuoteSpotlight,
    Component: BookingFocusLayout,
  },
  contactFocus: {
    canvasClassName: styles.templateCanvasContactFocus,
    Component: ContactFocusLayout,
  },
  localGuide: {
    canvasClassName: styles.templateCanvasLocalGuide,
    Component: LocalGuideLayout,
  },
  featureStack: {
    canvasClassName: styles.templateCanvasFeatureStack,
    Component: FeatureStackLayout,
  },
};

export const getTemplateSilhouetteLayout = (layout) =>
  TEMPLATE_SILHOUETTE_LAYOUTS[layout] || TEMPLATE_SILHOUETTE_LAYOUTS.panorama;
