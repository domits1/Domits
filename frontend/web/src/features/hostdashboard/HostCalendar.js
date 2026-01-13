import React, { useEffect, useState } from "react";
import "./HostHomepage.scss";
import spinner from "../../images/spinnner.gif";
import styles from "./HostDashboard.module.scss";
import calenderStyles from "./HostCalendar.module.css";
import { generateUUID } from "../../utils/generateUUID";
import { formatDate, uploadICalToS3 } from "../../utils/iCalFormatHost";
import { getAccessToken, getCognitoUserId } from "../../services/getAccessToken";
import CalendarComponent from "./hostcalendar/views/Calender";
import ExternalCalendarsCard from "./hostcalendar/components/ExternalCalendarsCard";
import {
  loadExternalBlockedDates,
  saveExternalBlockedDates,
} from "../../utils/externalCalendarStorage";

function HostCalendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);

  const [externalBlockedDates, setExternalBlockedDates] = useState(new Set());

  const getPropertyId = (a) => {
    const v =
      a?.property?.id ??
      a?.property?.ID ??
      a?.property?.propertyId ??
      a?.propertyId ??
      a?.PropertyId ??
      a?.ID ??
      a?.id ??
      null;
    return v === null || v === undefined ? "" : String(v);
  };

  const getTitle = (a) =>
    a?.property?.title ?? a?.property?.Title ?? a?.Title ?? a?.title ?? "";

  useEffect(() => {
    setUserId(getCognitoUserId());
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchAccommodations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
          { method: "GET", headers: { Authorization: getAccessToken() } }
        );

        if (!res.ok) throw new Error();
        const data = await res.json();
        setAccommodations(Array.isArray(data) ? data : []);
      } catch {
        setAccommodations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodations();
  }, [userId]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedAccommodation(null);
      setExternalBlockedDates(new Set());
      return;
    }

    const acc =
      accommodations.find((a) => getPropertyId(a) === selectedPropertyId) || null;

    setSelectedAccommodation(acc);
  }, [selectedPropertyId, accommodations]);

  useEffect(() => {
    if (!userId || !selectedPropertyId) {
      setExternalBlockedDates(new Set());
      return;
    }

    const loaded = loadExternalBlockedDates({
      userId,
      propertyId: selectedPropertyId,
    });

    setExternalBlockedDates(loaded);
  }, [userId, selectedPropertyId]);

  const handleSelectAccommodation = (e) => {
    setSelectedPropertyId(String(e.target.value || ""));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("The URL has been copied to your clipboard: " + text);
    } catch {}
  };

  const handleICal = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const listOfAccommodations = [];

    for (const acc of accommodations) {
      const dateRanges = acc?.DateRanges || [];

      for (const r of dateRanges) {
        const uid = generateUUID();
        const dtStamp = formatDate(new Date());
        const dtStart = formatDate(new Date(r.startDate));
        const dtEnd = formatDate(new Date(r.endDate));

        const accommodationId = getPropertyId(acc);

        const street = acc?.Street || "";
        const harbour = acc?.Harbour || "";
        const city = acc?.City || acc?.property?.city || "";
        const country = acc?.Country || acc?.property?.country || "";

        const location =
          acc?.AccommodationType === "Boat"
            ? `${harbour}, ${city}, ${country}`
            : `${street}, ${city}, ${country}`;

        const status = acc?.Drafted === true ? "Unavailable" : "Available";
        const title = getTitle(acc);
        const summary = `${title} - ${status}`;
        const ownerId = acc?.OwnerId || acc?.property?.ownerId;

        listOfAccommodations.push({
          UID: uid,
          Dtstamp: dtStamp,
          Dtstart: dtStart,
          Dtend: dtEnd,
          Summary: summary,
          Location: location,
          AccommodationId: accommodationId,
          OwnerId: ownerId,
        });
      }
    }

    try {
      const uploadURL = await uploadICalToS3(listOfAccommodations, userId);
      if (uploadURL) await copyToClipboard(uploadURL);
    } catch {}
  };

  const exportUrl = "";

  return (
    <div className="page-body">
      <h2>Calendar</h2>

      <div className={styles.dashboardHost}>
        {isLoading ? (
          <div className="loading-spinner-calender">
            <img src={spinner} alt="Loading" />
          </div>
        ) : accommodations.length < 1 ? (
          <p>No accommodations found...</p>
        ) : (
          <div className={calenderStyles.contentContainerCalendar}>
            <div className={calenderStyles.calendarHeader}>
              <button className={calenderStyles.exportICal} onClick={handleICal}>
                Export to calendar
              </button>

              <ExternalCalendarsCard
                exportUrl={exportUrl}
                exportLoading={false}
                userId={userId}
                onImportedBlockedDates={(blockedSet, meta) => {
                  const importedPid = String(meta?.propertyId || "").trim();
                  if (!userId || !importedPid) return;

                  saveExternalBlockedDates({
                    userId,
                    propertyId: importedPid,
                    blockedSet,
                  });

                  setSelectedPropertyId(importedPid);
                  setExternalBlockedDates(blockedSet);
                }}
              />
            </div>

            <div className={calenderStyles.calendarDropdown}>
              <div>
                <select
                  className={calenderStyles.locationBox}
                  onChange={handleSelectAccommodation}
                  value={selectedPropertyId}
                >
                  <option value="" className={calenderStyles.selectOption}>
                    Select your Accommodation
                  </option>

                  {accommodations
                    .map((a) => {
                      const pid = getPropertyId(a);
                      const label = getTitle(a) || pid || "Accommodation";
                      return pid ? { pid, label } : null;
                    })
                    .filter(Boolean)
                    .map(({ pid, label }) => (
                      <option key={pid} value={pid}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>

              {selectedAccommodation ? (
                <div>
                  <p>Booking availability for {getTitle(selectedAccommodation)}</p>

                  <div className={calenderStyles.locationBox}>
                    <CalendarComponent
                      passedProp={selectedAccommodation}
                      isNew={false}
                      updateDates={() => {}}
                      calenderType="host"
                      builder={null}
                      externalBlockedDates={externalBlockedDates}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.alertMessage}>
                  Please select your Accommodation first
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HostCalendar;