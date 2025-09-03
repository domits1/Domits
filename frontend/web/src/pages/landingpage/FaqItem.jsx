import React, { useEffect, useRef, useState } from "react";

const FaqItem = ({ question, answer, toggleOpen, isOpen }) => {
  const answerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (answerRef.current) {
      setHeight(answerRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className="landing__faq" onClick={toggleOpen}>
      <div className="landing__faq__body">
        <span className="landing__faq__question">{question}</span>
        <span className="landing__faq__arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      <div
        className="landing__faq__answer"
        style={{ maxHeight: isOpen ? `${height}px` : "0", overflow: "hidden" }}
        ref={answerRef}
      >
        {answer}
      </div>
    </div>
  );
};

export default FaqItem;


