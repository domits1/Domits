import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";

function StepsSection({ landingContent }) {
  return (
    <motion.section
      className="steps"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="container steps__inner">

        <motion.div className="steps__label" variants={fadeUp}>
  <span className="steps__line"></span>
  <span className="steps__text">THE PROCESS</span>
  <span className="steps__line"></span>
</motion.div>

        <motion.h2 className="steps__title" variants={fadeUp}>
          Three Steps.
          <br />
          <span>Zero Friction.</span>
        </motion.h2>

        <motion.div className="steps__grid" variants={staggerContainer}>

          <motion.div className="steps__item" variants={fadeUp}>
            <span className="steps__number">01</span>
            <h3>{landingContent.hosting.first.title}</h3>
            <p>{landingContent.hosting.first.description}</p>
          </motion.div>

          <motion.div className="steps__item" variants={fadeUp}>
            <span className="steps__number">02</span>
            <h3>{landingContent.hosting.second.title}</h3>
            <p>{landingContent.hosting.second.description}</p>
          </motion.div>

          <motion.div className="steps__item" variants={fadeUp}>
            <span className="steps__number">03</span>
            <h3>{landingContent.hosting.third.title}</h3>
            <p>{landingContent.hosting.third.description}</p>
          </motion.div>

        </motion.div>

      </div>
    </motion.section>
  );
}

export default StepsSection;