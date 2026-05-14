import React from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { Auth } from "aws-amplify";

function CtaSection({ isAuthenticated, group }) {
  const navigate = useNavigate();

  const handleStartHosting = async () => {
  if (!isAuthenticated) {
    navigate("/register");
    return;
  }

  if (group !== "Host") {
    try {
      const user = await Auth.currentAuthenticatedUser();

      await Auth.updateUserAttributes(user, {
        "custom:group": "Host",
      });

      navigate("/hostonboarding");
    } catch (error) {
      console.error(error);
    }

    return;
  }

  navigate("/hostonboarding");
};

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
          ✦ Join a community of hosts
        </motion.div>

        <motion.h2 className="cta-final__title" variants={fadeUp}>
          Ready to Elevate <br />
          Your Property Performance?
        </motion.h2>

        <motion.p className="cta-final__subtitle" variants={fadeUp}>
          Start earning more from your luxury vacation rentals today. No credit card required.
        </motion.p>

        <motion.button
          className="btn btn--primary"
          onClick={handleStartHosting}
          variants={fadeUp}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.97 }}
        >
          Start hosting now →
        </motion.button>

        <motion.div className="cta-final__benefits" variants={fadeUp}>
          <span>● Free to get started</span>
          <span>● No hidden fees</span>
          <span>● Cancel anytime</span>
        </motion.div>

      </div>
    </motion.section>
  );
}

CtaSection.propTypes = {
  group: PropTypes.string,
  isAuthenticated: PropTypes.bool,
};

export default CtaSection;