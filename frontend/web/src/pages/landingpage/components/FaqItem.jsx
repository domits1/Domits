import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { navigateToHostDestination } from "../../../utils/hostRedirect";

const FaqItem = ({ question, answer, answerLink, answerAfterLink, answerLinkHostRoute = "/hostdashboard", toggleOpen, isOpen }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  // Resolves host status fresh via Auth.currentAuthenticatedUser() at click time, not from mount-time context.
  const handleLinkClick = (e) => {
    e.stopPropagation();
    navigateToHostDestination({ navigate, hostPath: answerLinkHostRoute });
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