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
import { getCognitoUserId } from "../../../services/getAccessToken";
import { loadExternalBlockedDates, saveExternalBlockedDates } from "../../../utils/externalCalendarStorage";

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
    const loaded = loadExternalBlockedDates({ userId, propertyId: null });
    setExternalBlocked(loaded);
  }, [userId]);

  useEffect(() => {
    if (!externalBlocked?.size) return;
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
      if (isExternallyBlocked(key)) {
        const nextSel = {
          booked: new Set(prev.booked),
          available: new Set(prev.available),
          blocked: new Set(prev.blocked),
          maintenance: new Set(prev.maintenance),
        };
        nextSel.blocked.add(key);
        nextSel.available.delete(key);
        nextSel.booked.delete(key);
        nextSel.maintenance.delete(key);
        return nextSel;
      }

      const nextSel = {
        booked: new Set(prev.booked),
        available: new Set(prev.available),
        blocked: new Set(prev.blocked),
        maintenance: new Set(prev.maintenance),
      };

      if (nextSel[bucket].has(key)) nextSel[bucket].delete(key);
      else nextSel[bucket].add(key);

      Object.keys(nextSel).forEach((b) => {
        if (b !== bucket) nextSel[b].delete(key);
      });

      if (externalBlocked?.size) {
        externalBlocked.forEach((k) => nextSel.blocked.add(k));
        externalBlocked.forEach((k) => {
          nextSel.available.delete(k);
          nextSel.booked.delete(k);
          nextSel.maintenance.delete(k);
        });
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

    if (userId) {
      saveExternalBlockedDates({ userId, propertyId: null, blockedSet: cleaned });
    }

    setSelections((prev) => {
      const nextSel = {
        booked: new Set(prev.booked),
        available: new Set(prev.available),
        blocked: new Set(prev.blocked),
        maintenance: new Set(prev.maintenance),
      };

      cleaned.forEach((k) => nextSel.blocked.add(k));
      cleaned.forEach((k) => {
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

      if (externalBlocked?.size) {
        externalBlocked.forEach((k) => nextSel.blocked.add(k));
        externalBlocked.forEach((k) => {
          nextSel.available.delete(k);
          nextSel.booked.delete(k);
          nextSel.maintenance.delete(k);
        });
      }

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
        onDragSelect={handleDragSelect}
      />

      <StatsPanel selections={selections} />
    </div>
  );
}