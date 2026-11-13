import React, { useEffect, useState } from "react";
import { requestReview } from "../services/reviewAPI";
import styles from "../styles/ReceivedReviews.module.css";

export default function CategoryRatings({ userId, propertyIds }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [retry, setRetry] = useState(0);
  const idsKey = JSON.stringify([...new Set(propertyIds)].sort((a, b) => a.localeCompare(b)));

  useEffect(() => {
    let active = true;
    setTopics([]);
    setError(false);
    setPartial(false);
    const ids = JSON.parse(idsKey);
    if (!userId || !ids.length) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.allSettled(ids.map(async (propertyId) => {
      const response = await requestReview("GET", { scope: "property-categories", propertyId });
      if (!response.ok) throw new Error("Category request failed");
      const result = await response.json();
      if (!Array.isArray(result?.categories)) throw new Error("Invalid categories");
      for (const category of result.categories) {
        if (!category || typeof category.category_key !== "string" || typeof category.label !== "string"
          || !Number.isSafeInteger(category.rating_count) || category.rating_count < 0
          || (category.rating_count > 0 && (!Number.isFinite(category.average_rating)
            || category.average_rating < 1 || category.average_rating > 5))) {
          throw new Error("Invalid category count");
        }
      }
      return result.categories;
    })).then((results) => {
      const successful = results.filter((result) => result.status === "fulfilled");
      if (!successful.length) throw new Error("All category requests failed");
      if (active) setPartial(successful.length !== results.length);
      const combined = new Map();
      for (const category of successful.flatMap((result) => result.value)) {
        const current = combined.get(category.category_key) || { ...category, rating_count: 0, rating_sum: 0 };
        current.rating_sum += category.rating_count > 0 ? category.average_rating * category.rating_count : 0;
        current.rating_count += category.rating_count;
        combined.set(category.category_key, current);
      }
      if (active) setTopics([...combined.values()]
        .map((topic) => ({ ...topic, average_rating: topic.rating_count ? topic.rating_sum / topic.rating_count : null }))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.category_key.localeCompare(b.category_key)));
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, idsKey, retry]);

  return <section className={`${styles.recent} ${styles.categoryCard}`} aria-labelledby="common-topics-heading">
    <h3 id="common-topics-heading">Category ratings</h3>
    {!loading && !error && partial && <>
      <p className={styles.sidebarEmpty} role="status">Some properties could not be loaded. Showing available category ratings.</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
    </>}
    {loading && <p className={styles.sidebarEmpty} role="status">Loading category ratings...</p>}
    {error && <><p className={styles.sidebarEmpty} role="alert">Could not load category ratings.</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></>}
    {!loading && !error && (topics.length ? <ul className={styles.categoryRatings} aria-label="Average category ratings">
      {topics.map((topic) => <li key={topic.category_key}>
        <span>{topic.label}<small>{topic.rating_count} {topic.rating_count === 1 ? "review" : "reviews"}</small></span>
        {topic.average_rating === null ? <span className={styles.unrated}>No ratings yet</span> : <>
          <progress max="5" value={topic.average_rating} aria-label={`${topic.label}: ${topic.average_rating.toFixed(2)} out of 5`} />
          <strong><span aria-hidden="true">☆ </span>{topic.average_rating.toFixed(2)} / 5</strong></>}
      </li>)}
    </ul> : <p className={styles.sidebarEmpty}>No review categories available for your properties.</p>)}
  </section>;
}
