import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import {
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Zap
} from "lucide-react";

function FeaturesSection() {
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
          Outcome-Driven <span>Features</span>
        </motion.h2>

        <motion.div className="features__grid" variants={staggerContainer}>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon green">
              <Calendar size={18} />
            </div>
            <h3>Domits PMS with OTA</h3>
            <p>A centralized Property Management System (PMS) with booking channel integration.</p>
          </motion.div>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon green">
              <DollarSign size={18} />
            </div>
            <h3>Direct Reservation Suite</h3>
            <p>A direct booking website builder to reduce OTA costs and dependency</p>
          </motion.div>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon green">
              <MessageSquare size={18} />
            </div>
            <h3>Channel Management</h3>
            <p>Distribute to channels like Airbnb, Domits, Booking, Vrbo and more</p>
          </motion.div>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon teal">
              <BarChart3 size={18} />
            </div>
            <h3>Revenue Intelligence</h3>
            <p>Real-time insights into KPIs and dynamic pricing.</p>
          </motion.div>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon blue">
              <ShieldCheck size={18} />
            </div>
            <h3>Finance Suite</h3>
            <p>Guest payments, host payouts and precision management tools</p>
          </motion.div>

          <motion.div className="features__card" variants={fadeUp}>
            <div className="features__icon lime">
              <Zap size={18} />
            </div>
            <h3>Task Automation</h3>
            <p>Automate check-ins, cleaning schedule and maintenance requests</p>
          </motion.div>

        </motion.div>

      </div>
    </motion.section>
  );
}

export default FeaturesSection;