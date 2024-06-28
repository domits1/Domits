import React, { useEffect, useState } from "react";
import styles from './Calendar.module.css';
import { isSameDay } from "date-fns";
import dateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

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

    const dateRangesOverlap = (range1, range2) => {
        const { startDate: start1, endDate: end1 } = range1;
        const { startDate: start2, endDate: end2 } = range2;

        console.log((start1 <= start2 && start2 <= end1) ||
            (start1 <= end2 && end2 <= end1) ||
            (start2 <= start1 && start1 <= end2) ||
            (start2 <= end1 && end1 <= end2));
        return (
            (start1 <= start2 && (end1 === null || start2 <= end1)) ||
            (start1 <= end2 && (end1 === null || end2 <= end1)) ||
            (start2 <= start1 && (end2 === null || start1 <= end2)) ||
            (start2 <= end1 && (end2 === null || end1 <= end2))
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

        setDateRange(prevDateRange => {
            if (!prevDateRange.startDate) {
                return {
                    startDate: clickedDate,
                    endDate: null
                };
            }

            if (prevDateRange.startDate && !prevDateRange.endDate) {
                let newDateRange = {
                    ...prevDateRange,
                    endDate: clickedDate
                };
                if (clickedDate < newDateRange.startDate) {

                    console.log('nope');
                    newDateRange = {
                        startDate: clickedDate,
                        endDate: newDateRange.startDate
                    };

                    const overlappingIndex = selectedRanges.findIndex(range =>
                        dateRangesOverlap(newDateRange, range)
                    );

                    if (overlappingIndex !== -1) {
                        const updatedRanges = [...selectedRanges];
                        updatedRanges[overlappingIndex] = newDateRange;
                        setSelectedRanges(updatedRanges);
                    } else {
                        setSelectedRanges([...selectedRanges, newDateRange]);
                    }

                    return {
                        startDate: null,
                        endDate: null
                    };
                }

                const overlappingIndex = selectedRanges.findIndex(range =>
                    isDateInRange(newDateRange.startDate, range.startDate, range.endDate) ||
                    isDateInRange(newDateRange.endDate, range.startDate, range.endDate) ||
                    isDateInRange(range.startDate, newDateRange.startDate, newDateRange.endDate)
                );

                if (overlappingIndex !== -1) {
                    const updatedRanges = [...selectedRanges];
                    updatedRanges[overlappingIndex] = newDateRange;
                    setSelectedRanges(updatedRanges);
                } else {
                    setSelectedRanges([...selectedRanges, newDateRange]);
                }

                return {
                    startDate: null,
                    endDate: null
                };
            }
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

    const handleRemoveDateRange = (indexToRemove) => {
        const updatedRanges = [...selectedRanges];
        updatedRanges.splice(indexToRemove, 1);
        setSelectedRanges(updatedRanges);
    };


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
            </div>
            <div className={styles.dateRanges}>
                <header>
                    <h3>Selected date ranges:</h3>
                </header>
                <section className={styles.dateRangeSection}>
                    {selectedRanges.length > 0 ? selectedRanges.map((dateRange, index) => (
                        <div key={index} className={styles.dateRange}>
                            {`${DateFormatterDD_MM_YYYY(dateRange.startDate)} - ${DateFormatterDD_MM_YYYY(dateRange.endDate)}`}
                            <button className={styles.removeButton} onClick={() => handleRemoveDateRange(index)}>x</button>
                        </div>
                    )) : <div>Start by selecting your date range</div>}
                </section>
            </div>
        </main>
    );

}

export default CalendarComponent;
