import React, { useEffect, useMemo, useState } from "react";
import "./HostCalendar.scss";

import Toolbar from "./components/Toolbar";
import Legend from "./components/Legend";
import CalendarGrid from "./components/CalendarGrid";
import StatsPanel from "./components/StatsPanel";

import AvailabilityCard from "./components/Sidebar/AvailabilityCard";
import PricingCard from "./components/Sidebar/PricingCard";
import ExternalCalendarsCard from "./components/Sidebar/ExternalCalendarsCard";

import { getMonthMatrix, startOfMonthUTC, addMonthsUTC, subMonthsUTC } from "./utils/date";
import { getAccessToken, getCognitoUserId } from "../../../services/getAccessToken";
import { buildBlockedSetFromIcsEvents } from "../../../utils/icalConvert";
import {
  retrieveExternalCalendar,
  dbListIcalSources,
  dbUpsertIcalSource,
  dbDeleteIcalSource,
  dbRefreshAllIcalSources,
} from "../../../utils/icalRetrieveHost";

const initialBlocks = {
  booked: new Set(),
  available: new Set(),
  blocked: new Set(),
  maintenance: new Set(),
};

const initialPrices = {};

const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [selections, setSelections] = useState(initialBlocks);
  const [prices, setPrices] = useState(initialPrices);
  const [tempPrice, setTempPrice] = useState("");

  const [userId, setUserId] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [sources, setSources] = useState([]);
  const [externalBlocked, setExternalBlocked] = useState(new Set());

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  useEffect(() => {
    setUserId(getCognitoUserId());
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchFirstProperty = async () => {
      try {
        const url = new URL("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId");
        url.searchParams.set("hostId", userId);

        const token = getAccessToken();
        const res = await fetch(url.toString(), { method: "GET", headers: { Authorization: token } });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const pid = arr?.[0]?.property?.id ? String(arr[0].property.id) : "";
        if (pid) setPropertyId(pid);
      } catch {
        setPropertyId("");
      }
    };

    fetchFirstProperty().catch(() => setPropertyId(""));
  }, [userId]);

  useEffect(() => {
    if (!propertyId) return;

    const load = async () => {
      const { sources: s, blockedDates } = await dbListIcalSources(propertyId);
      setSources(s);
      setExternalBlocked(new Set(blockedDates));
    };

    load().catch(() => {
      setSources([]);
      setExternalBlocked(new Set());
    });
  }, [propertyId]);

  useEffect(() => {
    setSelections((prev) => {
      const nextSel = {
        booked: new Set(prev.booked),
        available: new Set(prev.available),
        blocked: new Set(prev.blocked),
        maintenance: new Set(prev.maintenance),
      };

      externalBlocked.forEach((k) => nextSel.blocked.add(k));
      externalBlocked.forEach((k) => {
        nextSel.available.delete(k);
        nextSel.booked.delete(k);
        nextSel.maintenance.delete(k);
      });

      return nextSel;
    });
  }, [externalBlocked]);

  const isExternallyBlocked = (key) => externalBlocked?.has(key);

  const toggleDayIn = (bucket, key) => {
    setSelections((prev) => {
      const nextSel = {
        booked: new Set(prev.booked),
        available: new Set(prev.available),
        blocked: new Set(prev.blocked),
        maintenance: new Set(prev.maintenance),
      };

      if (isExternallyBlocked(key)) {
        nextSel.blocked.add(key);
        nextSel.available.delete(key);
        nextSel.booked.delete(key);
        nextSel.maintenance.delete(key);
        return nextSel;
      }

      if (nextSel[bucket].has(key)) nextSel[bucket].delete(key);
      else nextSel[bucket].add(key);

      Object.keys(nextSel).forEach((b) => {
        if (b !== bucket) nextSel[b].delete(key);
      });

      externalBlocked.forEach((k) => nextSel.blocked.add(k));
      externalBlocked.forEach((k) => {
        nextSel.available.delete(k);
        nextSel.booked.delete(k);
        nextSel.maintenance.delete(k);
      });

      return nextSel;
    });
  };

  const handleDragSelect = (keys) => {
    const arr = Array.isArray(keys) ? keys : [];
    const filtered = arr.filter((k) => isYmd(k) && !isExternallyBlocked(k));

    setSelections((prev) => {
      const nextSel = {
        booked: new Set(prev.booked),
        available: new Set(filtered),
        blocked: new Set(prev.blocked),
        maintenance: new Set(prev.maintenance),
      };

      externalBlocked.forEach((k) => nextSel.blocked.add(k));
      externalBlocked.forEach((k) => {
        nextSel.available.delete(k);
        nextSel.booked.delete(k);
        nextSel.maintenance.delete(k);
      });

      return nextSel;
    });
  };

  const setPriceForSelection = () => {
    const value = parseFloat(tempPrice);
    if (Number.isNaN(value)) return;

    setPrices((prev) => {
      const nextPrices = { ...prev };
      selections.available.forEach((k) => (nextPrices[k] = value));
      selections.booked.forEach((k) => (nextPrices[k] = value));
      selections.blocked.forEach((k) => (nextPrices[k] = value));
      selections.maintenance.forEach((k) => (nextPrices[k] = value));
      return nextPrices;
    });

    setTempPrice("");
  };

  const addOrUpdateSource = async ({ propertyId: pid, calendarUrl, calendarName }) => {
    if (!pid) throw new Error("No property selected.");
    const { sources: s, blockedDates } = await dbUpsertIcalSource({ propertyId: pid, calendarUrl, calendarName });
    setSources(s);
    setExternalBlocked(new Set(blockedDates));
  };

  const removeSource = async (sourceId) => {
    if (!propertyId) return;
    const { sources: s, blockedDates } = await dbDeleteIcalSource({ propertyId, sourceId });
    setSources(s);
    setExternalBlocked(new Set(blockedDates));
  };

  const refreshAll = async () => {
    if (!propertyId) return;
    const { sources: s, blockedDates } = await dbRefreshAllIcalSources(propertyId);
    setSources(s);
    setExternalBlocked(new Set(blockedDates));
  };

  return (
    <div className="hc-container">
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        Property: {propertyId || "-"} · External blocked: {externalBlocked?.size || 0}
      </div>

      <div className="hc-header-row">
        <Toolbar view={view} setView={setView} cursor={cursor} onPrev={prev} onNext={next} onToday={today} />
      </div>

      <div className="hc-top-cards">
        <AvailabilityCard onBlock={() => {}} onMaintenance={() => {}} onUndo={() => setSelections(initialBlocks)} />
        <PricingCard tempPrice={tempPrice} setTempPrice={setTempPrice} onSetPrice={setPriceForSelection} />
        <ExternalCalendarsCard sources={sources} onAddSource={addOrUpdateSource} onRemoveSource={removeSource} onRefreshAll={refreshAll} />
      </div>

      <Legend />

      <CalendarGrid
        view={view}
        cursor={cursor}
        monthGrid={monthGrid}
        selections={selections}
        prices={prices}
        onToggle={(bucket, key) => toggleDayIn(bucket, key)}
        onDragSelect={handleDragSelect}
      />

      <StatsPanel selections={selections} />
    </div>
  );
}