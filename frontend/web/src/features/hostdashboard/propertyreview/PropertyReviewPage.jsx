import React, { useEffect, useState } from "react";
import { PROPERTY_REVIEW_ACCESS, checkPropertyReviewAccess } from "./propertyReviewAccess";
import PropertyReviewQueue from "./queue/PropertyReviewQueue";
import StateCard from "./StateCard";
import styles from "./PropertyReviewPage.module.css";

const CHECKING = "checking";

function PropertyReviewPage() {
  const [accessState, setAccessState] = useState(CHECKING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setAccessState(CHECKING);

    void checkPropertyReviewAccess()
      .catch(() => PROPERTY_REVIEW_ACCESS.UNAVAILABLE)
      .then((state) => {
        if (mounted) setAccessState(state);
      });

    return () => {
      mounted = false;
    };
  }, [attempt]);

  if (accessState === CHECKING) {
    return <StateCard title="Checking access" message="Validating your signed-in Domits account." />;
  }

  if (accessState === PROPERTY_REVIEW_ACCESS.DENIED) {
    return <StateCard title="Not authorized" message="Property review is limited to internal Domits admins." />;
  }

  if (accessState === PROPERTY_REVIEW_ACCESS.UNAVAILABLE) {
    return (
      <StateCard title="Property review" message="Could not check your access. Try again.">
        <button type="button" className={styles.retryButton} onClick={() => setAttempt((current) => current + 1)}>
          Retry
        </button>
      </StateCard>
    );
  }

  return (
    <StateCard title="Property review" message="Listings waiting for review.">
      <PropertyReviewQueue />
    </StateCard>
  );
}

export default PropertyReviewPage;
