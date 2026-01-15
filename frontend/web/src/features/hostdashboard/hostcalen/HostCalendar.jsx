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

const initialBlocks = {
  booked: new Set(),
  available: new Set(),
  blocked: new Set(),
  maintenance: new Set(),
};

const initialPrices = {};

const EXTERNAL_BLOCKED_STORAGE_KEY = "domits:externalBlockedKeys:v1";

const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const loadExternalBlocked = () => {
  try {
    const raw = window.sessionStorage.getItem(EXTERNAL_BLOCKED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed?.keys) ? parsed.keys : Array.isArray(parsed) ? parsed : [];
    return new Set(arr.filter(isYmd));
  } catch {
    return new Set();
  }
};

const saveExternalBlocked = (set) => {
  try {
    const keys = Array.from(set || []).filter(isYmd);
    window.sessionStorage.setItem(
      EXTERNAL_BLOCKED_STORAGE_KEY,
      JSON.stringify({ v: 1, savedAt: new Date().toISOString(), keys })
    );
  } catch {}
};

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [selections, setSelections] = useState(initialBlocks);
  const [prices, setPrices] = useState(initialPrices);
  const [tempPrice, setTempPrice] = useState("");

  const [externalBlocked, setExternalBlocked] = useState(() => loadExternalBlocked());

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  useEffect(() => {
    if (!externalBlocked?.size) return;
    setSelections((prev) => {
      const nextSel = { ...prev, blocked: new Set(prev.blocked) };
      externalBlocked.forEach((k) => nextSel.blocked.add(k));
      return nextSel;
    });
  }, [externalBlocked]);

  const toggleDayIn = (bucket, key) => {
    setSelections((prev) => {
      if (externalBlocked?.has(key)) {
        const nextSel = { ...prev, blocked: new Set(prev.blocked) };
        nextSel.blocked.add(key);
        return nextSel;
      }

      const nextSel = { ...prev, [bucket]: new Set(prev[bucket]) };
      if (nextSel[bucket].has(key)) nextSel[bucket].delete(key);
      else nextSel[bucket].add(key);

      Object.keys(prev).forEach((b) => {
        if (b !== bucket) nextSel[b] = new Set([...nextSel[b]].filter((k) => k !== key));
      });

      if (externalBlocked?.size) {
        nextSel.blocked = new Set(nextSel.blocked);
        externalBlocked.forEach((k) => nextSel.blocked.add(k));
      }

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

  const onImportedBlockedKeys = (blockedSet) => {
    const set = blockedSet instanceof Set ? blockedSet : new Set(blockedSet || []);
    const cleaned = new Set(Array.from(set).filter(isYmd));

    setExternalBlocked(cleaned);
    saveExternalBlocked(cleaned);

    setSelections((prev) => {
      const nextSel = { ...prev, blocked: new Set(prev.blocked) };
      cleaned.forEach((k) => nextSel.blocked.add(k));
      return nextSel;
    });
  };

  return (
    <div className="hc-container">
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        External blocked: {externalBlocked?.size || 0}
      </div>

      <div className="hc-header-row">
        <Toolbar view={view} setView={setView} cursor={cursor} onPrev={prev} onNext={next} onToday={today} />
      </div>

      <div className="hc-top-cards">
        <AvailabilityCard onBlock={() => {}} onMaintenance={() => {}} onUndo={() => setSelections(initialBlocks)} />
        <PricingCard tempPrice={tempPrice} setTempPrice={setTempPrice} onSetPrice={setPriceForSelection} />
        <ExternalCalendarsCard onImportedBlockedKeys={onImportedBlockedKeys} />
      </div>

      <Legend />

      <CalendarGrid
        view={view}
        cursor={cursor}
        monthGrid={monthGrid}
        selections={selections}
        prices={prices}
        onToggle={(bucket, key) => toggleDayIn(bucket, key)}
        onDragSelect={(keys) => setSelections((prev) => ({ ...prev, available: new Set(keys) }))}
      />

      <StatsPanel selections={selections} />
    </div>
  );
}