import React, { useContext } from "react";
import PropTypes from "prop-types";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const buildRuleKey = (() => {
  const separator = "::";

  return (rule, counts) => {
    const nextCount = (counts.get(rule) || 0) + 1;
    counts.set(rule, nextCount);
    return `${rule}${separator}${nextCount}`;
  };
})();

function HouseRules({ rules = [] }) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const ruleCounts = new Map();

  return (
    <div className="card">
      <h3>{t?.houseRules?.title || "House rules"}</h3>

      <div className="rulesList">
        {rules.length > 0 ? (
          rules.map((rule) => (
            <div key={buildRuleKey(rule, ruleCounts)} className="ruleItem">
              <span className="ruleItemIcon">-</span>
              <span>{rule}</span>
            </div>
          ))
        ) : (
          <div className="ruleItem">
            <span>{t?.houseRules?.noRules || "No additional house rules have been provided."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

HouseRules.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.string),
};

HouseRules.defaultProps = {
  rules: [],
};

export default HouseRules;
