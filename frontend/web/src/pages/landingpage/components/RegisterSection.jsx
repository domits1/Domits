import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { ShieldCheck, FileText, CheckCircle, Banknote, Headphones, Globe } from "lucide-react";

const CARD_ICONS = [ShieldCheck, FileText, CheckCircle, Banknote, Headphones, Globe];
const CARD_KEYS = ["verified", "rules", "how", "payments", "support", "renting"];

function RegisterSection({ content }) {
  const navigate = useNavigate();
  const { setFlowState } = useContext(FlowContext);

  const handleRegisterProperty = () =>
    startHostingFlow({
      isAuthenticated,
      group,
      navigate,
      setFlowState,
    });

  return (
    <motion.section
      className="register"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="register__container">

        <motion.h2 className="register__title" variants={fadeUp}>
          {content.title} <span>{content.simple}{content.and}{content.safe}</span>
        </motion.h2>

        <motion.p className="register__subtitle" variants={fadeUp}>
          {content.subtitle}
        </motion.p>

        <motion.div className="register__grid" variants={staggerContainer}>
          {CARD_KEYS.map((key, i) => {
            const Icon = CARD_ICONS[i];
            return (
              <motion.div className="register__card" variants={fadeUp} key={key}>
                <div className="register__icon"><Icon size={18} /></div>
                <h3>{content[key]?.title}</h3>
                <p>{content[key]?.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div className="register__cta" variants={fadeUp}>
          <button
            className="btn btn--primary"
            onClick={handleRegisterProperty}
          >
            {content.cta}
          </button>
        </motion.div>

      </div>
    </motion.section>
  );
}

RegisterSection.propTypes = {
  content: PropTypes.object.isRequired,
};

export default RegisterSection;
