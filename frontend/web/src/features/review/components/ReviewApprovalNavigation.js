import React from "react";
import { NavLink } from "react-router-dom";
import { Building, Star } from "lucide-react";
import { PROPERTY_REVIEW_ADMIN_ROUTE } from "../../hostdashboard/propertyreview/propertyReviewAccess";
import { REVIEW_APPROVAL_ADMIN_ROUTE } from "../navigation/reviewApprovalRoute";
import styles from "../styles/ReviewApproval.module.css";

const destinations = [
  { label: "Properties", path: PROPERTY_REVIEW_ADMIN_ROUTE, Icon: Building },
  { label: "Reviews", path: REVIEW_APPROVAL_ADMIN_ROUTE, Icon: Star },
];

export default function ReviewApprovalNavigation({ children }) {
  return (
    <div className={styles.shell}>
      <nav className={styles.navigation} aria-label="Admin panel">
        <h2>Admin Panel</h2>
        <ul>
          {destinations.map(({ label, path, Icon }) => (
            <li key={label}>
              <NavLink to={`/hostdashboard/${path}`} end>
                <Icon size={19} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
