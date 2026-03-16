import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getAccommodationByPropertyId } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";
import {
  normalizeImageUrl,
  resolveAccommodationImageUrl,
} from "../../utils/accommodationImage";

const buildListingUrl = (propertyId) => {
  if (!propertyId) return "#";
  return `/listingDetails?ID=${encodeURIComponent(propertyId)}`;
};

const ListingPanel = ({ dashboardType, propertyId, propertyTitle, accoImage }) => {
  const isGuest = dashboardType === "guest";
  const { accessToken } = useUser();

  const [loading, setLoading] = useState(false);
  const [acco, setAcco] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const endpoint = isGuest ? "bookingEngine/listingDetails" : "hostDashboard/single";
  const needsAuth = !isGuest;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!propertyId) {
        setAcco(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const token = needsAuth ? accessToken : null;
        const data = await getAccommodationByPropertyId(endpoint, propertyId, token);
        if (!cancelled) setAcco(data || null);
      } catch (e) {
        if (!cancelled) {
          setAcco(null);
          setLoadError("Failed to load listing details.");
          console.warn("ListingPanel: failed to load accommodation", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [propertyId, endpoint, needsAuth, accessToken]);

  const title = useMemo(() => {
    return propertyTitle || acco?.property?.title || acco?.property?.name || (propertyId ? `Listing #${propertyId}` : "");
  }, [propertyTitle, acco, propertyId]);

  const imageUrl = useMemo(() => {
    if (accoImage) return normalizeImageUrl(accoImage);
    return (
      resolveAccommodationImageUrl(acco?.images?.[0], "thumb") ||
      resolveAccommodationImageUrl(acco?.property?.images?.[0], "thumb") ||
      null
    );
  }, [accoImage, acco]);

  if (!propertyId) return null;

  return (
    <div className="messages-v2-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e6e8ee",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16 }}>Listing</div>
        {loading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading…</div> : null}
        {loadError ? <div style={{ fontSize: 12, color: "#ef4444" }}>{loadError}</div> : null}
      </div>

      <div style={{ padding: 16, overflow: "auto" }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10, color: "#0f172a" }}>{title}</div>

        {imageUrl ? (
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e6e8ee" }}>
            <img
              src={imageUrl}
              alt={title}
              style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div
            style={{
              borderRadius: 14,
              border: "1px dashed #e6e8ee",
              padding: 14,
              color: "#64748b",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            No image available
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <a
            href={buildListingUrl(propertyId)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              borderRadius: 12,
              border: "1px solid #e6e8ee",
              background: "#fff",
              fontWeight: 900,
              color: "#0f172a",
              textDecoration: "none",
            }}
          >
            Open listing
          </a>
        </div>
      </div>
    </div>
  );
};

ListingPanel.propTypes = {
  dashboardType: PropTypes.string,
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  propertyTitle: PropTypes.string,
  accoImage: PropTypes.string,
};

export default ListingPanel;
