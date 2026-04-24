import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";

function ChecklistSection() {
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
          Is your property <span>suitable for renting out?</span>
        </motion.h2>

        <motion.p className="checklist__subtitle" variants={fadeUp}>
          Here is the minimal requirements checklist for renting out properties.
        </motion.p>

        <motion.div className="checklist__grid" variants={staggerContainer}>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>General</h4>
              <p>The property is fully equipped and meets rental regulations.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Building</h4>
              <p>Well-maintained structure, heating, and utilities.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Furnishing</h4>
              <p>Safe, clean, and functional furniture and lighting.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Bedrooms</h4>
              <p>Proper beds, mattresses, and bedding.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Kitchen</h4>
              <p>Fully equipped with working appliances and utensils.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Pool & Jacuzzi</h4>
              <p>Professionally installed and maintained.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Surroundings</h4>
              <p>Clean, accessible outdoor areas and parking.</p>
            </div>
          </motion.div>

          <motion.div className="checklist__item" variants={fadeUp}>
            <div className="checklist__icon">✔</div>
            <div>
              <h4>Safety</h4>
              <p>Smoke detectors, secure structures, safe access.</p>
            </div>
          </motion.div>

        </motion.div>

        <motion.div className="checklist__cta" variants={fadeUp}>
          <p>Ready to list your property? Our team will guide you through every step.</p>
          <span>✔ Verified properties get 3x more bookings</span>
        </motion.div>

      </div>
    </motion.section>
  );
}

export default ChecklistSection;