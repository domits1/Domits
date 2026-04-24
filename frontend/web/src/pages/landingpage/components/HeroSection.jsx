import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { Banknote, ShieldCheck, Phone, BadgeCheck } from "lucide-react";

import airbnbLogo from "../../../images/airbnb-logo.svg";
import bookingLogo from "../../../images/booking-logo.svg";
import vrboLogo from "../../../images/vrbo-logo.svg";
import domitsLogo from "../../../images/domits-logo.svg";
import heroImage from "../../../images/hero-image.svg";
import checkIcon from "../../../images/check-icon.svg";

function HeroSection({ landingContent }) {
  const navigate = useNavigate();

  return (
    <section className="hero">

      <motion.div
        className="layout-container hero__inner"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >

        <motion.div className="hero__content" variants={fadeUp}>

          <motion.div className="hero__badge" variants={fadeUp}>
            <span className="dot"></span>
            Trusted by many hosts
          </motion.div>

          <motion.h1 className="hero__title" variants={fadeUp}>
            Your Properties.
            <br />
            <span>Our Infrastructure.</span>
          </motion.h1>

          <motion.p className="hero__description" variants={fadeUp}>
            Turn your luxury vacation rentals into a revenue stream that runs
            itself. More revenue. Less workload. Total confidence.
          </motion.p>

          <motion.div className="hero__actions" variants={fadeUp}>
            <motion.button
              className="btn btn--primary"
              onClick={() => navigate("/register")}
              whileHover={{ scale: 1.05 }}
            >
              Start Hosting →
            </motion.button>

            <motion.button
              className="btn btn--secondary"
              onClick={() =>
                document.querySelector(".steps")?.scrollIntoView({ behavior: "smooth" })
              }
              whileHover={{ scale: 1.05 }}
            >
              See how it works
            </motion.button>
          </motion.div>

          <motion.div className="hero__stats" variants={fadeUp}>
            <div><strong>30%</strong><span>more revenue</span></div>
            <div><strong>60%</strong><span>workload reduction</span></div>
            <div><strong>24/7</strong><span>support</span></div>
          </motion.div>

          <motion.div className="hero__integrations" variants={fadeUp}>
            <span>Seamlessly integrates with</span>

            <div className="hero__logos">

              <motion.div className="channel channel--airbnb" variants={fadeUp}>
                <div className="channel__icon">
                  <img src={airbnbLogo} alt="" />
                </div>
                <span>Airbnb</span>
                <div className="channel__check">
                  <img src={checkIcon} alt="" />
                </div>
              </motion.div>

              <motion.div className="channel channel--booking" variants={fadeUp}>
                <div className="channel__icon">
                  <img src={bookingLogo} alt="" />
                </div>
                <span>Booking.com</span>
                <div className="channel__check">
                  <img src={checkIcon} alt="" />
                </div>
              </motion.div>

              <motion.div className="channel channel--vrbo" variants={fadeUp}>
                <div className="channel__icon">
                  <img src={vrboLogo} alt="" />
                </div>
                <span>Vrbo</span>
                <div className="channel__check">
                  <img src={checkIcon} alt="" />
                </div>
              </motion.div>

              <motion.div className="channel channel--domits" variants={fadeUp}>
                <div className="channel__icon">
                  <img src={domitsLogo} alt="" />
                </div>
                <span>Domits</span>
                <div className="channel__check">
                  <img src={checkIcon} alt="" />
                </div>
              </motion.div>

            </div>
          </motion.div>

        </motion.div>

        <motion.div className="hero__visual" variants={fadeUp}>
          <img src={heroImage} alt="dashboard" />
        </motion.div>

      </motion.div>

      <motion.div
        className="layout-container"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="hero__proofs" variants={fadeUp}>
          <div className="hero__proofs-list">

            <motion.div className="hero__proof" variants={fadeUp}>
              <Banknote size={18} />
              <p>{landingContent.secure}</p>
            </motion.div>

            <motion.div className="hero__proof" variants={fadeUp}>
              <ShieldCheck size={18} />
              <p>{landingContent.verified}</p>
            </motion.div>

            <motion.div className="hero__proof" variants={fadeUp}>
              <Phone size={18} />
              <p>{landingContent.quick}</p>
            </motion.div>

            <motion.div className="hero__proof" variants={fadeUp}>
              <BadgeCheck size={18} />
              <p>{landingContent.guarantee}</p>
            </motion.div>

          </div>
        </motion.div>
      </motion.div>

    </section>
  );
}

export default HeroSection;