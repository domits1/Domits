import PropTypes from "prop-types";
import styles from "./WebsiteBuilderPage.module.scss";

const FEATURE_CARD_IDS = ["trust", "details", "cta"];
const TRUST_CARD_IDS = ["reviews", "policies"];
const NAV_DOT_IDS = ["primary", "secondary", "tertiary"];
const TRUST_META_IDS = ["one", "two", "three"];
const RIGHT_META_IDS = ["first", "second"];
const silhouetteLayoutPropTypes = {
  getTargetProps: PropTypes.func.isRequired,
};

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

FeatureStackLayout.propTypes = silhouetteLayoutPropTypes;
TrustSignalsLayout.propTypes = silhouetteLayoutPropTypes;
PanoramaLayout.propTypes = silhouetteLayoutPropTypes;

export const TEMPLATE_SILHOUETTE_LAYOUTS = {
  panorama: {
    canvasClassName: styles.templateCanvasPanorama,
    Component: PanoramaLayout,
  },
  trustSignals: {
    canvasClassName: styles.templateCanvasTrustSignals,
    Component: TrustSignalsLayout,
  },
  featureStack: {
    canvasClassName: styles.templateCanvasFeatureStack,
    Component: FeatureStackLayout,
  },
};

export const getTemplateSilhouetteLayout = (layout) =>
  TEMPLATE_SILHOUETTE_LAYOUTS[layout] || TEMPLATE_SILHOUETTE_LAYOUTS.panorama;
