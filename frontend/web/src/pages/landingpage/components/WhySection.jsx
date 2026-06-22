import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { Globe, DollarSign, Mail, CreditCard, BarChart3, Zap } from "lucide-react";

const FEATURE_ICONS = [Globe, DollarSign, Mail, CreditCard, BarChart3, Zap];

function WhySection({ content }) {
  const features = content?.features ? Object.values(content.features) : [];

  return (
    <motion.section
      className="why"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="why__container">

        <motion.div className="why__content" variants={staggerContainer}>

          <motion.h2 variants={fadeUp}>
            {content.sectionTitle} <span>Domits</span>
          </motion.h2>

          <motion.p variants={fadeUp}>
            {content.sectionDescription}
          </motion.p>

          <motion.div className="why__features" variants={staggerContainer}>
            {features.map((label, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <motion.div className="why__feature" variants={fadeUp} key={label}>
                  <div className="why__icon">{Icon && <Icon size={16} />}</div>
                  <span>{label}</span>
                </motion.div>
              );
            })}
          </motion.div>

        </motion.div>

        <motion.div className="why__video" variants={fadeUp}>
          <div className="why__video-card">

            <div className="why__video-inner">
              <iframe
                src="https://www.youtube.com/embed/MQ9GCI65IWg"
                title="Domits Video"
                frameBorder="0"
                allowFullScreen
              />
              <div className="why__overlay"></div>
            </div>

            <div className="why__badge">
              <span>Average rating</span>
              <strong>{content.rating}</strong>
            </div>

          </div>
        </motion.div>

      </div>
    </motion.section>
  );
}

WhySection.propTypes = {
  content: PropTypes.object.isRequired,
};

export default WhySection;
