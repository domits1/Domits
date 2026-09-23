import React from "react";
import PropTypes from "prop-types";
import styles from "./styles/MissedRevenueCards.module.scss";

export function MissedRevenueCards({ cards }) {
  return (
    <div className={styles.cardGrid}>
      {cards.map((card) => (
        <article key={card.id} className={styles.card}>
          <p className={styles.cardTitle}>{card.title}</p>
          <p className={styles.cardValue}>{card.value}</p>
          {card.meta ? <p className={styles.cardMeta}>{card.meta}</p> : null}
        </article>
      ))}
    </div>
  );
}

MissedRevenueCards.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      meta: PropTypes.string,
    })
  ).isRequired,
};

export default MissedRevenueCards;
