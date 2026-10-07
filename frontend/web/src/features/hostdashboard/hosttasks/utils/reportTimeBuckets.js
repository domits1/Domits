export const getIntervalKey = (timestamp, timeView) => {
    if (!timestamp) return null;
    const date = new Date(Number(timestamp));
    if (timeView === 'Daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
};

export const getSortTimestamp = (timestamp, timeView) => {
    if (!timestamp) return 0;
    const date = new Date(Number(timestamp));
    if (timeView === 'Daily') return date.getTime();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
};
