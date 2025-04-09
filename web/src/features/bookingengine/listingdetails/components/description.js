import { useState, useRef, useEffect } from "react";

const Description = ({ description }) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    const currentDescRef = descRef.current;
    if (currentDescRef) {
      const lineHeight = parseFloat(
        getComputedStyle(currentDescRef).lineHeight,
      );
      const lines = currentDescRef.scrollHeight / lineHeight;
      setShowToggle(lines > 3);
    }
  }, [description]);

  return (
    <div>
      <div
        ref={descRef}
        className={`description ${expanded ? "expanded" : "collapsed"}`}
      >
        {description}
      </div>
      {showToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="toggle-button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

export default Description;
