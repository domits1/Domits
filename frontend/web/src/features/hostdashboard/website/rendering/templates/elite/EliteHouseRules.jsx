import React, { useId } from "react";
import PropTypes from "prop-types";
import BabyChangingStationRounded from "@mui/icons-material/BabyChangingStationRounded";
import CelebrationRounded from "@mui/icons-material/CelebrationRounded";
import ChildFriendlyRounded from "@mui/icons-material/ChildFriendlyRounded";
import Co2Rounded from "@mui/icons-material/Co2Rounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import FireExtinguisherRounded from "@mui/icons-material/FireExtinguisherRounded";
import LocalParkingRounded from "@mui/icons-material/LocalParkingRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";
import PetsRounded from "@mui/icons-material/PetsRounded";
import RuleRounded from "@mui/icons-material/RuleRounded";
import SensorsRounded from "@mui/icons-material/SensorsRounded";
import SmokeFreeRounded from "@mui/icons-material/SmokeFreeRounded";
import SoupKitchenRounded from "@mui/icons-material/SoupKitchenRounded";
import styles from "./eliteSitePage.module.scss";

const CANCELLATION_RULE_PREFIX = "CancellationPolicy:";
const HOUSE_RULE_ICONS = new Map([
  ["SmokeDetector", SensorsRounded],
  ["CarbonMonoxide", Co2Rounded],
  ["FireExtinguisher", FireExtinguisherRounded],
  ["FirstAidKit", MedicalServicesRounded],
  ["CookingAllowed", SoupKitchenRounded],
  ["ParkingAvailable", LocalParkingRounded],
  ["SmokingAllowed", SmokeFreeRounded],
  ["PetsAllowed", PetsRounded],
  ["Parties/EventsAllowed", CelebrationRounded],
  ["SuitableForChildren", ChildFriendlyRounded],
  ["SuitableForInfants", BabyChangingStationRounded],
]);

const resolveHouseRuleIcon = (rule) => {
  if (HOUSE_RULE_ICONS.has(rule)) {
    return HOUSE_RULE_ICONS.get(rule);
  }
  return rule.startsWith(CANCELLATION_RULE_PREFIX) ? EventAvailableRounded : RuleRounded;
};

export default function EliteHouseRules({ rules }) {
  const headingId = useId();

  return (
    <section className={`${styles.eliteSection} ${styles.eliteRules}`} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.eliteHeading}>
        House rules
      </h2>
      <ul className={styles.eliteRulesList}>
        {rules.map(({ label, rule }) => {
          const RuleIcon = resolveHouseRuleIcon(rule);
          return (
            <li key={label} className={styles.eliteRuleCard} data-house-rule={rule || "other"}>
              <RuleIcon className={styles.eliteRuleIcon} aria-hidden="true" focusable="false" />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

EliteHouseRules.propTypes = {
  rules: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      rule: PropTypes.string.isRequired,
    })
  ).isRequired,
};
