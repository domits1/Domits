import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { Calendar, DollarSign, MessageSquare, BarChart3, ShieldCheck, Zap } from "lucide-react";

const CARD_CONFIG = [
  { key: "pmsOta", icon: Calendar, color: "green" },
  { key: "directReservation", icon: DollarSign, color: "green" },
  { key: "channelManagement", icon: MessageSquare, color: "green" },
  { key: "revenueIntelligence", icon: BarChart3, color: "teal" },
  { key: "financeSuite", icon: ShieldCheck, color: "blue" },
  { key: "taskAutomation", icon: Zap, color: "lime" },
];

function FeaturesSection({ content }) {
  return (
    <motion.section
      className="features"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="features__container">

        <motion.h2 className="features__title" variants={fadeUp}>
          {content.title} <span>{content.span}</span>
        </motion.h2>

        <motion.div className="features__grid" variants={staggerContainer}>
          {CARD_CONFIG.map(({ key, icon: Icon, color }) => (
            <motion.div className="features__card" variants={fadeUp} key={key}>
              <div className={`features__icon ${color}`}>
                <Icon size={18} />
              </div>
              <h3>{content[key]?.title}</h3>
              <p>{content[key]?.description}</p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </motion.section>
  );
}

FeaturesSection.propTypes = {
  content: PropTypes.object.isRequired,
};

export default FeaturesSection;
