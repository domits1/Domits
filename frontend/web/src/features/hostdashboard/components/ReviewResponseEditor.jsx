import React, { useEffect, useState } from "react";
import {
  deleteReviewResponse,
  editReviewResponse,
  publishReviewResponse,
  saveDraftReviewResponse,
} from "../services/reviewResponseService";

function ReviewResponseEditor({ review, onChanged, styles = {} }) {
  const existingResponse = review?.response || null;
  const [message, setMessage] = useState(existingResponse?.message || "");
  const [isEditing, setIsEditing] = useState(!existingResponse);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessage(existingResponse?.message || "");
    setIsEditing(!existingResponse);
    setError("");
  }, [existingResponse]);

  const isEligible = review?.status === "PUBLISHED" && review?.publicationStatus === "PUBLISHED";
  const isDraft = existingResponse?.status === "draft";
  const isDisabled = isSaving || !message.trim();
  const saveButtonLabel = existingResponse && !isDraft ? "Save changes" : "Save draft";

  const runAction = async (action, closeEditor = true) => {
    setIsSaving(true);
    setError("");

    try {
      await action();
      await onChanged?.();
      if (closeEditor) {
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.message || "Could not update the response.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEligible) {
    return (
      <p className={styles.responseDisabled}>
        Public responses are available only after this review is published.
      </p>
    );
  }

  if (existingResponse && !isEditing) {
    return (
      <div className={styles.responsePreview}>
        <div className={styles.responsePreviewHeader}>
          <strong>Host response</strong>
          <span className={isDraft ? styles.responseDraftBadge : styles.responsePublishedBadge}>
            {isDraft ? "Draft" : "Published"}
          </span>
        </div>

        <p>{existingResponse.message}</p>

        {error && <p className={styles.responseError}>{error}</p>}

        <div className={styles.responseActions}>
          <button type="button" onClick={() => setIsEditing(true)} disabled={isSaving}>
            Edit
          </button>
          {isDraft && (
            <button
              type="button"
              onClick={() => runAction(() => publishReviewResponse(review.id, existingResponse.message))}
              disabled={isSaving}
            >
              Publish
            </button>
          )}
          <button
            type="button"
            onClick={() => runAction(() => deleteReviewResponse(review.id), false)}
            disabled={isSaving}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.responseEditor}>
      <label className={styles.responseLabel}>
        Response
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a professional response to this public review."
          rows={4}
          disabled={isSaving}
        />
      </label>

      {error && <p className={styles.responseError}>{error}</p>}

      <div className={styles.responseActions}>
        <button
          type="button"
          onClick={() =>
            runAction(() =>
              existingResponse
                ? editReviewResponse(review.id, message)
                : saveDraftReviewResponse(review.id, message)
            )
          }
          disabled={isDisabled}
        >
          {saveButtonLabel}
        </button>
        <button
          type="button"
          onClick={() => runAction(() => publishReviewResponse(review.id, message))}
          disabled={isDisabled}
        >
          Publish
        </button>
        {existingResponse && (
          <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewResponseEditor;
