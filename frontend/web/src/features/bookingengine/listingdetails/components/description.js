import PropTypes from "prop-types";
import { useState, useRef, useEffect } from "react";
import { FaRegBuilding } from "react-icons/fa";
import SkeletonBlock from "./SkeletonBlock";

const Description = ({ description, isLoading = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      setShowToggle(false);
      return;
    }

    const currentDescRef = descRef.current;
    if (currentDescRef) {
      const lineHeight = Number.parseFloat(
        getComputedStyle(currentDescRef).lineHeight,
      );
      const lines = currentDescRef.scrollHeight / lineHeight;
      setShowToggle(lines > 3);
    }
  }, [description, isLoading]);

  return (
    <div className="description-container">
      <div className="description-header">
        <span className="description-header__icon" aria-hidden="true">
          <FaRegBuilding />
        </span>
        <h3 className="description-header__title">About this property</h3>
      </div>
      {isLoading ? (
        <div className="description" aria-busy="true">
          <SkeletonBlock width="100%" height={18} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="96%" height={18} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="88%" height={18} />
        </div>
      ) : (
        <div
          ref={descRef}
          className={`description ${expanded ? "expanded" : "collapsed"}`}
        >
          {description}
        </div>
      )}
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="toggle-button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

Description.propTypes = {
  description: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default Description;
