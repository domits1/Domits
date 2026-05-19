import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import FlowContext from "../../../services/FlowContext";
import { startHostingFlow } from "../../../utils/hostFlow";

function CtaSection({ content }) {
  const navigate = useNavigate();
  const { setFlowState } = useContext(FlowContext);

  const handleStartHosting = () =>
    startHostingFlow({
      isAuthenticated,
      group,
      navigate,
      setFlowState,
    });

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
          onClick={handleStartHosting}
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
