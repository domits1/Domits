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
import { retrieveExternalCalendar } from "../../../utils/icalRetrieveHost";
import { buildBlockedSetFromIcsEvents } from "../../../utils/icalConvert";
import {
  loadIcalSources,
  saveIcalSources,
  loadExternalBlockedDates,
  saveExternalBlockedDates,
} from "../../../utils/externalCalenderStorage";

import { generateExportUrl } from "../../../utils/icalGenerateHost";

const initialBlocks = {
  booked: new Set(),
  available: new Set(),
  blocked: new Set(),
  maintenance: new Set(),
};

const initialPrices = {};

const isYmd = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const hashSourceId = (url) => {
  const s = String(url || "").trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `src_${(h >>> 0).toString(16)}`;
};

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [selections, setSelections] = useState(initialBlocks);
  const [prices, setPrices] = useState(initialPrices);
  const [tempPrice, setTempPrice] = useState("");

  const [userId, setUserId] = useState(null);
  const [sources, setSources] = useState([]);
  const [externalBlocked, setExternalBlocked] = useState(new Set());

  const [exportUrl, setExportUrl] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  useEffect(() => {
    setUserId(getCognitoUserId());
  }, []);

  useEffect(() => {
    if (!userId) return;
    setSources(loadIcalSources(userId));
    setExternalBlocked(loadExternalBlockedDates({ userId }));
  }, [userId]);

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

  const refreshExport = async () => {
    if (!userId) return;
    setExportLoading(true);
    setExportError(null);
    try {
      const url = await generateExportUrl({
        propertyId: String(userId),
        calendarName: "Domits",
        selections,
        prices,
      });
      setExportUrl(url);
    } catch (e) {
      setExportUrl("");
      setExportError(e?.message || "Failed to generate export link");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    refreshExport().catch(() => {});
  }, [userId]);

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

  const rebuildFromSources = async (nextSources) => {
    const allBlocked = new Set();

    for (const s of nextSources) {
      const url = String(s?.calendarUrl || "").trim();
      if (!url) continue;

      try {
        const events = await retrieveExternalCalendar(url);
        const blocked = buildBlockedSetFromIcsEvents(events);
        blocked.forEach((k) => allBlocked.add(k));
      } catch (e) {
        console.error("Failed source sync:", url, e);
      }
    }

    setExternalBlocked(allBlocked);
    if (userId) saveExternalBlockedDates({ userId, blockedSet: allBlocked });
  };

  const addOrUpdateSource = async ({ calendarUrl, calendarName }) => {
    const url = String(calendarUrl || "").trim();
    const name = String(calendarName || "").trim();
    if (!url) return;

    const sourceId = hashSourceId(url);

    const nextSources = (() => {
      const prev = Array.isArray(sources) ? sources : [];
      const existingIdx = prev.findIndex((x) => x?.sourceId === sourceId);
      const next = [...prev];

      const item = {
        sourceId,
        calendarUrl: url,
        calendarName: name || "EXTERNAL",
        lastSyncAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) next[existingIdx] = item;
      else next.push(item);

      return next;
    })();

    setSources(nextSources);
    if (userId) saveIcalSources(userId, nextSources);

    await rebuildFromSources(nextSources);
    await refreshExport().catch(() => {});
  };

  const removeSource = async (sourceId) => {
    const nextSources = (Array.isArray(sources) ? sources : []).filter((s) => s?.sourceId !== sourceId);
    setSources(nextSources);
    if (userId) saveIcalSources(userId, nextSources);
    await rebuildFromSources(nextSources);
    await refreshExport().catch(() => {});
  };

  const refreshAll = async () => {
    await rebuildFromSources(sources);
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
        <ExternalCalendarsCard
          sources={sources}
          onAddSource={addOrUpdateSource}
          onRemoveSource={removeSource}
          onRefreshAll={refreshAll}
          exportUrl={exportUrl}
          exportLoading={exportLoading}
          exportError={exportError}
          onGenerateExport={refreshExport}
        />
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