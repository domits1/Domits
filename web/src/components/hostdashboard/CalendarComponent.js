import React, { useEffect, useState } from "react";
import styles from './Calendar.module.css';
import { isSameDay } from "date-fns";

function CalendarComponent() {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [dates, setDates] = useState([]);
    const [selectedRanges, setSelectedRanges] = useState([]);
    const [dateRange, setDateRange] = useState({
        startDate: null,
        endDate: null
    });

    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    // Function to check if two date ranges overlap
    const dateRangesOverlap = (range1, range2) => {
        const { startDate: start1, endDate: end1 } = range1;
        const { startDate: start2, endDate: end2 } = range2;

        return (
            (start1 <= start2 && start2 <= end1) ||   // Range 2 starts between Range 1
            (start1 <= end2 && end2 <= end1) ||       // Range 2 ends between Range 1
            (start2 <= start1 && start1 <= end2) ||   // Range 1 starts between Range 2
            (start2 <= end1 && end1 <= end2)          // Range 1 ends between Range 2
        );
    };

    const renderDates = () => {
        const start = new Date(year, month, 1).getDay();
        const endDate = new Date(year, month + 1, 0).getDate();
        const end = new Date(year, month, endDate).getDay();
        const endDatePrev = new Date(year, month, 0).getDate();
        const newDates = [];

        for (let i = start; i > 0; i--) {
            newDates.push(
                <li key={`inactive-prev-${endDatePrev - i + 1}`} className={styles.inactive}>
                    {`${endDatePrev - i + 1}`}
                </li>
            );
        }

        for (let i = 1; i <= endDate; i++) {
            const currentDate = new Date(year, month, i);
            const isActiveDay = isSameDay(currentDate, new Date());
            const isSelected = selectedRanges.some(range => isDateInRange(currentDate, range.startDate, range.endDate));
            const isStartDate = selectedRanges.some(range => isSameDay(range.startDate, currentDate));
            const isEndDate = selectedRanges.some(range => isSameDay(range.endDate, currentDate));
            newDates.push(
                <li
                    key={`active-${i}`}
                    className={`${isActiveDay ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isStartDate ? styles.startDate : ''} ${isEndDate ? styles.endDate : ''}`}
                    onClick={() => handleDateClick(currentDate)}
                >
                    {`${i}`}
                </li>
            );
        }

        for (let i = end + 1; i <= 6; i++) {
            newDates.push(
                <li key={`inactive-next-${i}`} className={styles.inactive}>
                    {`${i - end}`}
                </li>
            );
        }

        setDates(newDates);
    };

    const handleDateClick = (dateClicked) => {
        const clickedDate = new Date(dateClicked);

        // Using a callback to ensure correct state update based on previous state
        setDateRange(prevDateRange => {
            // Case 1: No startDate set, start a new range
            if (!prevDateRange.startDate) {
                return {
                    startDate: clickedDate,
                    endDate: null
                };
            }

            // Case 2: startDate set, but no endDate set, complete the range selection
            if (prevDateRange.startDate && !prevDateRange.endDate) {
                // Ensure endDate is after startDate
                if (clickedDate > prevDateRange.startDate) {
                    // Check for overlapping ranges
                    const overlappingIndex = selectedRanges.findIndex(range =>
                        dateRangesOverlap(prevDateRange, range)
                    );

                    if (overlappingIndex !== -1) {
                        const updatedRanges = [...selectedRanges];

                        // Check for complete overlap
                        const overlappingRange = updatedRanges[overlappingIndex];
                        if (
                            (prevDateRange.startDate <= overlappingRange.startDate && clickedDate >= overlappingRange.endDate) ||
                            (prevDateRange.startDate >= overlappingRange.startDate && clickedDate <= overlappingRange.endDate)
                        ) {
                            // Complete overlap, remove the overlapping range
                            updatedRanges.splice(overlappingIndex, 1);
                        } else {
                            // Partial overlap, adjust the existing range
                            const newStartDate = overlappingRange.startDate < prevDateRange.startDate ? overlappingRange.startDate : prevDateRange.startDate;
                            const newEndDate = overlappingRange.endDate > clickedDate ? overlappingRange.endDate : clickedDate;
                            updatedRanges[overlappingIndex] = {
                                startDate: newStartDate,
                                endDate: newEndDate
                            };
                        }

                        setSelectedRanges(updatedRanges);
                    } else {
                        // No overlap, add new range
                        const updatedRanges = [
                            ...selectedRanges,
                            {
                                startDate: prevDateRange.startDate,
                                endDate: clickedDate
                            }
                        ];
                        setSelectedRanges(updatedRanges);
                    }

                    return {
                        startDate: null,
                        endDate: null
                    };
                } else {
                    // If clickedDate is before startDate, treat as starting a new range
                    return {
                        startDate: clickedDate,
                        endDate: null
                    };
                }
            }

            // Case 3: Both startDate and endDate set, handle range removal or other logic
            const updatedRanges = [...selectedRanges];
            const existingRangeIndex = updatedRanges.findIndex(range => isDateInRange(clickedDate, range.startDate, range.endDate));
            if (existingRangeIndex !== -1) {
                // Remove the range if clicked again
                updatedRanges.splice(existingRangeIndex, 1);
            }

            // Update selectedRanges and reset dateRange state
            setSelectedRanges(updatedRanges);
            return {
                startDate: null,
                endDate: null
            };
        });
    };

    const isDateInRange = (date, startDate, endDate) => {
        return startDate && endDate && date >= startDate && date <= endDate;
    };

    const navigateDates = (nav) => {
        let newMonth = month;
        let newYear = year;

        if (nav === 'prev') {
            newMonth = (month === 0) ? 11 : month - 1;
            newYear = (month === 0) ? year - 1 : year;
        } else if (nav === 'next') {
            newMonth = (month === 11) ? 0 : month + 1;
            newYear = (month === 11) ? year + 1 : year;
        }

        setMonth(newMonth);
        setYear(newYear);
    };

    useEffect(() => {
        renderDates();
    }, [month, year, selectedRanges]);

    return (
        <main className={styles.body}>
            <div className={styles.calendar}>
                <header>
                    <h3>{`${months[month]} ${year}`}</h3>
                    <nav>
                        <button className={styles.prev} onClick={() => navigateDates('prev')}></button>
                        <button className={styles.next} onClick={() => navigateDates('next')}></button>
                    </nav>
                </header>
                <section>
                    <ul className="days">
                        <li>Sun</li>
                        <li>Mon</li>
                        <li>Tue</li>
                        <li>Wed</li>
                        <li>Thu</li>
                        <li>Fri</li>
                        <li>Sat</li>
                    </ul>
                    <ul className="dates">
                        {dates}
                    </ul>
                </section>
                <section>
                    <button onClick={() => console.log(selectedRanges)}>Show</button>
                </section>
            </div>
        </main>
    );
}

export default CalendarComponent;
