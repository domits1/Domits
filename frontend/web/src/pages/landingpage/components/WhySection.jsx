import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import {
  Globe,
  DollarSign,
  Mail,
  CreditCard,
  BarChart3,
  Zap
} from "lucide-react";

function WhySection() {
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
            Why <span>Domits</span>
          </motion.h2>

          <motion.p variants={fadeUp}>
            Domits transforms the future of luxury vacation rental management into
            a seamless experience. From listing to payout, everything is handled in
            one centralized place so you can focus on growth, not operations.
          </motion.p>

          <motion.div className="why__features" variants={staggerContainer}>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><Globe size={16} /></div>
              <span>Domits PMS with OTA</span>
            </motion.div>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><DollarSign size={16} /></div>
              <span>Revenue Management</span>
            </motion.div>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><Mail size={16} /></div>
              <span>Direct Reservations</span>
            </motion.div>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><CreditCard size={16} /></div>
              <span>Finance Suite</span>
            </motion.div>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><BarChart3 size={16} /></div>
              <span>Channel Management</span>
            </motion.div>

            <motion.div className="why__feature" variants={fadeUp}>
              <div className="why__icon"><Zap size={16} /></div>
              <span>Task Automations</span>
            </motion.div>

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
              <strong>4.9 ★</strong>
            </div>

          </div>
        </motion.div>

      </div>
    </motion.section>
  );
}

export default WhySection;