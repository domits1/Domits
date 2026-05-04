import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  Banknote,
  Headphones,
  Globe
} from "lucide-react";

function RegisterSection() {
  const navigate = useNavigate();

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
          Register your Property <span>Simple and Safe</span>
        </motion.h2>

        <motion.p className="register__subtitle" variants={fadeUp}>
          Everything you need to rent out your property with confidence and peace of mind.
        </motion.p>

        <motion.div className="register__grid" variants={staggerContainer}>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><ShieldCheck size={18} /></div>
            <h3>Verified guests</h3>
            <p>We verify guests with email address, phone, a personal message and payments with our partner Stripe.</p>
          </motion.div>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><FileText size={18} /></div>
            <h3>Your own house rules</h3>
            <p>Let your potential guests know your house rules. They must agree in order to book.</p>
          </motion.div>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><CheckCircle size={18} /></div>
            <h3>Choose how you want to receive your bookings</h3>
            <p>You can allow your guests to book directly.</p>
          </motion.div>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><Banknote size={18} /></div>
            <h3>Receive payments regularly and securely</h3>
            <p>You are guaranteed to be paid and can rely on fraud protection with our payments.</p>
          </motion.div>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><Headphones size={18} /></div>
            <h3>Dedicated support</h3>
            <p>Our rental expert team is available to assist you with any questions or issues, ensures a smooth hassle-free experience.</p>
          </motion.div>

          <motion.div className="register__card" variants={fadeUp}>
            <div className="register__icon"><Globe size={18} /></div>
            <h3>International renting</h3>
            <p>You rent out your holiday home on an international market. This makes the chances of renting out your holiday home even greater.</p>
          </motion.div>

        </motion.div>

        <motion.div className="register__cta" variants={fadeUp}>
          <button
            className="btn btn--primary"
            onClick={() => navigate("/hostonboarding")}
          >
            Register Your Property →
          </button>
        </motion.div>

      </div>
    </motion.section>
  );
}

export default RegisterSection;