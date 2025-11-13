import React, { useEffect, useState, useCallback } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

// --- API endpoints ---
const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";
const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

// --- Assets / helpers ---
const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;

const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return placeholderImage;
  const val = String(maybeKeyOrUrl);
  return val.startsWith("http") ? val : `${S3_URL}${val}`;
};

function GuestBooking() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [guestId, setGuestId] = useState(null);
  const [user, setUser] = useState({ name: "", email: "" });
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  // Cache of propertyId -> { title, imageUrl }
  const [propertyMap, setPropertyMap] = useState({});
  const [propLoading, setPropLoading] = useState(false);

  // --- Load basic user info ---
  useEffect(() => {
    (async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        const cognitoSub = userInfo?.attributes?.sub || null;
        setGuestId(cognitoSub);
        setUser({
          name: userInfo?.attributes?.given_name || "",
          email: userInfo?.attributes?.email || "",
        });
      } catch (err) {
        console.error("[GuestBooking] Auth info error:", err);
        setError("Could not load your session.");
        setIsLoading(false);
      }
    })();
  }, []);

  // --- Utilities ---
  const getPropertyId = (b) =>
    b?.property_id ?? b?.propertyId ?? b?.PropertyID ?? b?.id ?? b?.ID ?? null;

  const getTimestamp = (bookingItem) => {
    const numericValue = Number(
      bookingItem?.createdat ??
        bookingItem?.createdAt ??
        bookingItem?.arrivaldate ??
        bookingItem?.arrivalDate
    );
    if (Number.isFinite(numericValue)) {
      const ms =
        String(Math.trunc(numericValue)).length <= 10
          ? numericValue * 1000
          : numericValue;
      return ms;
    }
    const dateString =
      bookingItem?.createdAt ??
      bookingItem?.arrivalDate ??
      bookingItem?.arrival_date;
    const parsedDate = dateString ? new Date(dateString) : null;
    return parsedDate && !isNaN(parsedDate) ? parsedDate.getTime() : 0;
  };

  // --- Fetch bookings from API ---
  const fetchBookings = useCallback(async () => {
    if (!guestId) return;

    setIsLoading(true);
    setError("");

    try {
      const requestUrl = new URL(API_FETCH_BOOKINGS);
      requestUrl.searchParams.set("guestId", guestId);

      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: await getAccessToken(),
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        console.error("[GuestBooking] Non-OK response body:", responseText);
        throw new Error(
          `Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim()
        );
      }

      const rawData = await response.json().catch(async () => {
        const fallbackText = await response.text();
        try {
          return JSON.parse(fallbackText);
        } catch {
          return fallbackText;
        }
      });

      // Normalize payload (handle several shapes)
      let normalizedBookings = [];
      if (Array.isArray(rawData)) normalizedBookings = rawData;
      else if (Array.isArray(rawData?.data)) normalizedBookings = rawData.data;
      else if (Array.isArray(rawData?.response))
        normalizedBookings = rawData.response;
      else if (typeof rawData?.body === "string") {
        try {
          const innerParsed = JSON.parse(rawData.body);
          if (Array.isArray(innerParsed)) normalizedBookings = innerParsed;
          else if (Array.isArray(innerParsed?.response))
            normalizedBookings = innerParsed.response;
        } catch (parseError) {
          console.warn(
            "[GuestBooking] Could not parse body string:",
            parseError
          );
        }
      }

      // Sort by latest created/arrival date
      normalizedBookings.sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
      );

      setBookings(normalizedBookings);
    } catch (err) {
      console.error("[GuestBooking] Booking fetch error:", err);
      setError("Could not load your bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [guestId]);

  useEffect(() => {
    if (guestId) fetchBookings();
  }, [guestId, fetchBookings]);

  // --- Fetch property details (title + image) after bookings load ---
  const fetchPropertyDetails = useCallback(
    async (propertyIds) => {
      if (!propertyIds?.length) return;

      // Only fetch details we don't already have
      const toFetch = propertyIds.filter((id) => id && !propertyMap[id]);
      if (!toFetch.length) return;

      setPropLoading(true);
      try {
        const results = await Promise.all(
          toFetch.map(async (pid) => {
            try {
              const resp = await fetch(buildListingDetailsUrl(pid));
              if (!resp.ok)
                throw new Error(`Property ${pid} failed ${resp.status}`);
              const data = await resp.json().catch(() => ({}));

              // Try common response shapes
              const title =
                data?.title ||
                data?.propertyTitle ||
                data?.name ||
                data?.property?.title ||
                `Property #${pid}`;

              const imageKey =
                data?.coverImage ||
                data?.image ||
                data?.images?.[0]?.key ||
                data?.property?.coverImage ||
                data?.property?.images?.[0]?.key ||
                null;

              return [pid, { title, imageUrl: normalizeImageUrl(imageKey) }];
            } catch (e) {
              console.warn("[PropertyDetails] error for", pid, e);
              return [pid, { title: `Property #${pid}`, imageUrl: placeholderImage }];
            }
          })
        );

        setPropertyMap((prev) => {
          const next = { ...prev };
          results.forEach(([pid, obj]) => {
            next[pid] = obj;
          });
          return next;
        });
      } finally {
        setPropLoading(false);
      }
    },
    [propertyMap]
  );

  useEffect(() => {
    if (!bookings?.length) return;
    const paid = bookings.filter(
      (b) =>
        String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
    );
    const ids = Array.from(new Set(paid.map(getPropertyId).filter(Boolean)));
    if (ids.length) fetchPropertyDetails(ids);
  }, [bookings, fetchPropertyDetails]);

  // --- UI helpers ---
  const handleBookingClick = (bookingItem) => {
    const propertyId = getPropertyId(bookingItem);
    if (propertyId)
      navigate(`/listingdetails?ID=${encodeURIComponent(propertyId)}`);
  };

  const formatBookingDates = (bookingItem) => {
    const toDate = (value) => {
      if (value == null) return null;
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        const milliseconds =
          String(Math.trunc(numericValue)).length <= 10
            ? numericValue * 1000
            : numericValue;
        const parsed = new Date(milliseconds);
        return isNaN(parsed) ? null : parsed;
      }
      const parsed = new Date(value);
      return isNaN(parsed) ? null : parsed;
    };

    const arrivalDate =
      toDate(
        bookingItem?.arrivaldate ??
          bookingItem?.arrival_date ??
          bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      toDate(
        bookingItem?.departuredate ??
          bookingItem?.departure_date ??
          bookingItem?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) return "-";
    return `${dateFormatterDD_MM_YYYY(arrivalDate)} → ${dateFormatterDD_MM_YYYY(
      departureDate
    )}`;
  };

  // --- Render ---
  return (
    <main className="page-body">
      <div className="dashboardHost">
        <div className="dashboardContainer">
          <div className="dashboardLeft">
            <h3 className="welcomeMsg">{user.name || "Guest"} Bookings</h3>

            <div className="dashboardHead">
              <div className="buttonBox">
                <button
                  className="greenBtn"
                  onClick={fetchBookings}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <h3>My Paid Bookings:</h3>
            </div>

            {(() => {
              if (isLoading) {
                return (
                  <div className="loader" style={{ padding: 24 }}>
                    Loading…
                  </div>
                );
              }
              if (error) {
                return (
                  <div className="error" role="alert" style={{ padding: 12 }}>
                    {error}
                  </div>
                );
              }

              const paidBookings = bookings.filter(
                (b) =>
                  String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
              );

              if (paidBookings.length === 0) {
                return (
                  <div className="emptyState">
                    <p>You don’t have any paid bookings yet.</p>
                  </div>
                );
              }

              return (
                <>
                  {propLoading && (
                    <div className="loader" style={{ padding: 8 }}>
                      Loading property details…
                    </div>
                  )}

                  {paidBookings.map((bookingItem, index) => {
                    const propertyId = getPropertyId(bookingItem);

                    // Fallback title from booking
                    const fallbackTitle =
                      bookingItem?.title ||
                      bookingItem?.Title ||
                      (bookingItem?.property_id
                        ? `Property #${bookingItem.property_id}`
                        : "Booking");

                    // Prefer API-derived info
                    const propertyInfo = propertyId
                      ? propertyMap[propertyId]
                      : undefined;

                    const displayTitle = propertyInfo?.title || fallbackTitle;

                    // Prefer API image, then booking fields
                    const candidateImageKey =
                      propertyInfo?.imageUrl ||
                      bookingItem?.propertyImage ||
                      bookingItem?.image ||
                      bookingItem?.images?.[0]?.key ||
                      bookingItem?.property?.coverImage ||
                      bookingItem?.property?.images?.[0]?.key ||
                      null;

                    const imageUrl = normalizeImageUrl(candidateImageKey);

                    const bookingCity =
                      bookingItem?.city ||
                      bookingItem?.location?.city ||
                      "Unknown city";

                    const bookingStatus = String(
                      bookingItem?.status || bookingItem?.Status || ""
                    );

                    return (
                      <div
                        key={
                          bookingItem?.id ||
                          bookingItem?.ID ||
                          `${index}-${displayTitle}`
                        }
                        className="dashboardCard"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBookingClick(bookingItem)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ")
                            handleBookingClick(bookingItem);
                        }}
                        style={{
                          // temporary basic styling (you’ll refine later)
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 12,
                          boxShadow: "0 4px 14px rgba(0,0,0,.08)",
                        }}
                      >
                        {/* Property image */}
                        <img
                          src={imageUrl}
                          alt={displayTitle}
                          className="img-listed-dashboard"
                          style={{
                            width: "100%",
                            height: "200px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            marginBottom: "10px",
                            display: "block",
                          }}
                          onError={(e) => (e.currentTarget.src = placeholderImage)}
                        />

                        <div className="accommodationText" style={{ marginBottom: 8 }}>
                          <p
                            className="accommodationTitle"
                            style={{ fontWeight: 600, lineHeight: 1.3 }}
                          >
                            {displayTitle}
                          </p>
                          <p
                            className="accommodationLocation"
                            style={{ color: "#6b7280" }}
                          >
                            {bookingCity}
                          </p>
                        </div>

                        <div
                          className="accommodationDetails"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            className="statusLive"
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              background: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            {bookingStatus || "—"}
                          </span>
                          <span>{formatBookingDates(bookingItem)}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </main>
  );
}

export default GuestBooking;
