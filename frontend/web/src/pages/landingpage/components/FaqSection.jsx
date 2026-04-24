import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import FaqItem from "./FaqItem";

function FaqSection({ faqs, toggleOpen }) {
  return (
    <motion.section
      className="faq-landing"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="faq-landing__container">

        <motion.h2 className="faq-landing__title" variants={fadeUp}>
          Answers to <span>Your Questions</span>
        </motion.h2>

        <motion.div className="faq-landing__list" variants={staggerContainer}>
          {faqs.map((faq, index) => (
            <motion.div key={index} variants={fadeUp}>
              <FaqItem
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen(index)}
              />
            </motion.div>
          ))}
        </motion.div>

      </div>
    </motion.section>
  );
}

export default FaqSection;