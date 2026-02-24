import React, { useEffect, useMemo, useState } from "react";
import { getAccommodationByPropertyId } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { useUser } from "../../features/hostdashboard/hostmessages/context/AuthContext";

const S3_ACCO_BASE = "https://accommodation.s3.eu-north-1.amazonaws.com/";

const isHttp = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

const buildListingUrl = (propertyId) => {
  if (!propertyId) return "#";
  return `/listingDetails?ID=${encodeURIComponent(propertyId)}`;
};

const ListingPanel = ({ dashboardType, propertyId, propertyTitle, accoImage }) => {
  const isGuest = dashboardType === "guest";
  const { accessToken } = useUser();

  const [loading, setLoading] = useState(false);
  const [acco, setAcco] = useState(null);

  if (!propertyId) return null;

  const endpoint = isGuest ? "bookingEngine/listingDetails" : "hostDashboard/single";
  const needsAuth = !isGuest;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const token = needsAuth ? accessToken : null;
        const data = await getAccommodationByPropertyId(endpoint, propertyId, token);
        if (!cancelled) setAcco(data || null);
      } catch (e) {
        if (!cancelled) setAcco(null);
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
    return (
      propertyTitle ||
      acco?.property?.title ||
      acco?.property?.name ||
      `Listing #${propertyId}`
    );
  }, [propertyTitle, acco, propertyId]);

  const imageUrl = useMemo(() => {
    if (isHttp(accoImage)) return accoImage;
    const key = acco?.images?.[0]?.key || acco?.property?.images?.[0]?.key || null;
    if (key) return `${S3_ACCO_BASE}${key}`;

    return null;
  }, [accoImage, acco]);

  return (
    <div className="messages-v2-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e6e8ee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Listing</div>
        {loading ? <div style={{ fontSize: 12, color: "#64748b" }}>Loading…</div> : null}
      </div>

      <div style={{ padding: 16, overflow: "auto" }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10, color: "#0f172a" }}>
          {title}
        </div>

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

export default ListingPanel;
