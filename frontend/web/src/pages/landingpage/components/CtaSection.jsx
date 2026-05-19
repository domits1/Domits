import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";

function CtaSection({ content }) {
  const navigate = useNavigate();

  return (
    <motion.section
      className="cta-final"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={staggerContainer}
    >
      <div className="cta-final__container">

        <motion.div className="cta-final__badge" variants={fadeUp}>
          {content.badge}
        </motion.div>

        <motion.h2 className="cta-final__title" variants={fadeUp}>
          {content.title}
        </motion.h2>

        <motion.p className="cta-final__subtitle" variants={fadeUp}>
          {content.subtitle}
        </motion.p>

        <motion.button
          className="btn btn--primary"
          onClick={() => navigate("/hostonboarding")}
          variants={fadeUp}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.97 }}
        >
          {content.button}
        </motion.button>

        <motion.div className="cta-final__benefits" variants={fadeUp}>
          <span>{content.benefit1}</span>
          <span>{content.benefit2}</span>
          <span>{content.benefit3}</span>
        </motion.div>

      </div>
    </motion.section>
  );
}

CtaSection.propTypes = {
  content: PropTypes.object.isRequired,
};

export default CtaSection;
