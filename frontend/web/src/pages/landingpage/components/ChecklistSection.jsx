import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";

const ITEM_KEYS = ["general", "building", "furnishing", "bedroom", "kitchen", "pool", "surroundings", "safety"];

function ChecklistSection({ content }) {
  return (
    <motion.section
      className="checklist"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="checklist__container">

        <motion.h2 className="checklist__title" variants={fadeUp}>
          {content.title} <span>{content.rent}</span>
        </motion.h2>

        <motion.p className="checklist__subtitle" variants={fadeUp}>
          {content.description}
        </motion.p>

        <motion.div className="checklist__grid" variants={staggerContainer}>
          {ITEM_KEYS.map((key) => (
            <motion.div className="checklist__item" variants={fadeUp} key={key}>
              <div className="checklist__icon">✔</div>
              <div>
                <h4>{content[key]?.title}</h4>
                <p>{content[key]?.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="checklist__cta" variants={fadeUp}>
          <p>{content.cta}</p>
          <span>{content.ctaBadge}</span>
        </motion.div>

      </div>
    </motion.section>
  );
}

ChecklistSection.propTypes = {
  content: PropTypes.object.isRequired,
};

export default ChecklistSection;
