import React, { useMemo, useState } from "react";
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

export default function HostCalendar() {
  const [view, setView] = useState("month"); 
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [selections, setSelections] = useState(initialBlocks);
  const [prices, setPrices] = useState(initialPrices);
  const [tempPrice, setTempPrice] = useState("");

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  const toggleDayIn = (bucket, key) => {
    setSelections((prev) => {
      const next = { ...prev, [bucket]: new Set(prev[bucket]) };
      if (next[bucket].has(key)) next[bucket].delete(key);
      else next[bucket].add(key);
      
      Object.keys(prev).forEach((b) => {
        if (b !== bucket) next[b] = new Set([...next[b]].filter((k) => k !== key));
      });
      return next;
    });
  };

  const setPriceForSelection = () => {
    const value = parseFloat(tempPrice);
    if (Number.isNaN(value)) return;
    setPrices((prev) => {
      const next = { ...prev };
      selections.available.forEach((k) => (next[k] = value));
      selections.booked.forEach((k) => (next[k] = value));
      selections.blocked.forEach((k) => (next[k] = value));
      selections.maintenance.forEach((k) => (next[k] = value));
      return next;
    });
    setTempPrice("");
  };

  return (
    <div className="hc-container">
      <div className="hc-header-row">
        <Toolbar
          view={view}
          setView={setView}
          cursor={cursor}
          onPrev={prev}
          onNext={next}
          onToday={today}
        />
      </div>

      <div className="hc-top-cards">
        <AvailabilityCard
          onBlock={() => {}}
          onMaintenance={() => {}}
          onUndo={() => setSelections(initialBlocks)}
        />
        <PricingCard
          tempPrice={tempPrice}
          setTempPrice={setTempPrice}
          onSetPrice={setPriceForSelection}
        />
        <ExternalCalendarsCard />
      </div>

      <Legend />

      <CalendarGrid
        view={view}
        cursor={cursor}
        monthGrid={monthGrid}
        selections={selections}
        prices={prices}
        onToggle={(bucket, key) => toggleDayIn(bucket, key)}
        onDragSelect={(keys) =>
          setSelections((prev) => ({ ...prev, available: new Set(keys) }))
        }
      />

      <StatsPanel selections={selections} />
    </div>
  );
}