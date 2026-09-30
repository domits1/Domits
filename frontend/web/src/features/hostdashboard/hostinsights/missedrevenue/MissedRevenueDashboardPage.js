import React, { useEffect, useState } from "react";
import { fetchMissedRevenue } from "./services/missedRevenueService";
import { buildMissedRevenueMetricCards } from "./missedRevenueConfig";
import { MissedRevenueCards } from "./MissedRevenueCards";
import styles from "./styles/MissedRevenueDashboardPage.module.scss";

const toIsoDate = (date) => date.toISOString().slice(0, 10);

export const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

export const getPreviousMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

export const getYearToDateRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return { startDate: toIsoDate(start), endDate: toIsoDate(now) };
};

const PERIODS = [
  { id: "current-month", label: "Current month", getRange: getCurrentMonthRange },
  { id: "previous-month", label: "Previous month", getRange: getPreviousMonthRange },
  { id: "year-to-date", label: "Year to date", getRange: getYearToDateRange },
];

export default function MissedRevenueDashboardPage() {
  const [periodData, setPeriodData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const entries = await Promise.all(
          PERIODS.map(async (period) => [period.id, await fetchMissedRevenue(period.getRange())])
        );

        if (isMounted) {
          setPeriodData(Object.fromEntries(entries));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "We could not load your missed revenue insights.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p>Loading missed revenue insights...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const currentMonthData = periodData["current-month"];

  if (currentMonthData?.connected === false) {
    return <p>Connect PriceLabs to see your missed revenue insights.</p>;
  }

  return (
    <div className={styles.page}>
      {PERIODS.map((period) => (
        <section key={period.id} className={styles.periodSection}>
          <h2>{period.label}</h2>
          <MissedRevenueCards cards={buildMissedRevenueMetricCards(periodData[period.id])} />
        </section>
      ))}

      <section className={styles.periodSection}>
        <h2>By property (current month)</h2>
        <table className={styles.propertyTable}>
          <thead>
            <tr>
              <th>Property</th>
              <th>Actual revenue</th>
              <th>Potential revenue</th>
              <th>Missed revenue</th>
            </tr>
          </thead>
          <tbody>
            {(currentMonthData?.byProperty || []).map((property) => (
              <tr key={property.propertyId}>
                <td>{property.propertyId}</td>
                <td>EUR {property.actualRevenue.toFixed(2)}</td>
                <td>EUR {property.potentialRevenue.toFixed(2)}</td>
                <td>EUR {property.missedRevenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
