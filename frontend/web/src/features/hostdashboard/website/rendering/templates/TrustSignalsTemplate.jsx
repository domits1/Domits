import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";

export default function TrustSignalsTemplate({ model }) {
  return (
    <article className={styles.templateSite}>
      <div className={styles.templateTopBar}>
        <div className={styles.templateTopBarBrand}>
          <span className={styles.templateTopBarMark} aria-hidden="true" />
          <span>{model.site.title}</span>
        </div>
        <div className={styles.templateTopBarMeta}>
          {model.stay.minimumStayLabel ? <span>{model.stay.minimumStayLabel}</span> : null}
          {model.location.label ? <span>{model.location.label}</span> : null}
        </div>
      </div>

      <section className={styles.trustSignalsShell}>
        <div className={styles.trustSignalsIntro}>
          <p className={styles.sectionEyebrow}>Trust-oriented layout</p>
          <h1 className={styles.heroTitle}>{model.hero.title}</h1>
          <p className={styles.heroDescription}>{model.hero.description}</p>
        </div>

        <img className={styles.trustSignalsHeroImage} src={model.media.heroImage} alt={model.hero.title} />

        <div className={styles.trustSignalsStack}>
          {model.trustCards.slice(0, 2).map((card) => (
            <article key={card.id} className={styles.trustSignalsCard}>
              <div className={styles.trustSignalsCardMeta}>
                <span />
                <span />
                <span />
              </div>
              <p className={styles.signalTitle}>{card.title}</p>
              <p>{card.description}</p>
            </article>
          ))}
        </div>

        <div className={styles.trustSignalsFooter}>
          <div className={styles.softCallout}>
            <strong>{model.callToAction.label}</strong>
            <p>{model.callToAction.note}</p>
          </div>
        </div>
      </section>
    </article>
  );
}

TrustSignalsTemplate.propTypes = {
  model: PropTypes.shape({
    hero: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
    }).isRequired,
    media: PropTypes.shape({
      heroImage: PropTypes.string,
    }).isRequired,
    trustCards: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ).isRequired,
    stay: PropTypes.shape({
      minimumStayLabel: PropTypes.string,
    }).isRequired,
    location: PropTypes.shape({
      label: PropTypes.string,
    }).isRequired,
    callToAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
      note: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
