import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../features/auth/UserContext";

const FaqItem = ({ question, answer, answerLink, answerAfterLink, answerLinkHostRoute = "/hostdashboard", toggleOpen, isOpen }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);
  const navigate = useNavigate();
  const { role } = useUser() || {};

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  // NOTE: role loads async on mount, so a host could still briefly land on /register if they click before it resolves.
  const handleLinkClick = (e) => {
    e.stopPropagation();
    navigate(role === "Host" ? answerLinkHostRoute : "/register");
  };

  return (
    <motion.div
      className="landing__faq"
      onClick={toggleOpen}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
    >
      <div className="landing__faq__body">

        <span className="landing__faq__question">
          {question}
        </span>

        <motion.span
          className="landing__faq__arrow"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          ▼
        </motion.span>

      </div>

      <motion.div
        className="landing__faq__answer"
        animate={{ maxHeight: isOpen ? height : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        <div ref={contentRef}>
          {answer}
          {answerLink && (
            <>
              <button type="button" className="landing__faq__link" onClick={handleLinkClick}>
                {answerLink}
              </button>
              {answerAfterLink}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FaqItem;