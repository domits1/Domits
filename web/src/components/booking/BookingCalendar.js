import React, { useEffect, useState } from "react";
import styles from './BookingCalendar.module.css';
import { isSameDay } from "date-fns";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import { useNavigate } from "react-router-dom";

function BookingCalendar({ passedProp, checkIn, checkOut }) {
    const [month1, setMonth1] = useState(new Date().getMonth());
    const [month2, setMonth2] = useState(new Date().getMonth() + 1); // Set the second calendar's initial month to next month
    const [year, setYear] = useState(new Date().getFullYear());
    const [dates1, setDates1] = useState([]);
    const [dates2, setDates2] = useState([]);

    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    const renderDates = (month, setDates) => {
        const today = new Date();
        const start = new Date(year, month, 1).getDay();
        const endDate = new Date(year, month + 1, 0).getDate();
        const end = new Date(year, month, endDate).getDay();
        const endDatePrev = new Date(year, month, 0).getDate();
        const newDates = [];

        for (let i = start; i > 0; i--) {
            const date = new Date(year, month - 1, endDatePrev - i + 1);
            newDates.push(
                <li
                    key={`inactive-prev-${endDatePrev - i + 1}`}
                    className={`${styles.date} ${styles.inactive} ${date < today ? styles.disabled : ''}`}
                >
                    {`${endDatePrev - i + 1}`}
                </li>
            );
        }

        for (let i = 1; i <= endDate; i++) {
            const currentDate = new Date(year, month, i);
            const isActiveDay = isSameDay(currentDate, new Date());
            const isSelected = passedProp.DateRanges.some(range => isDateInRange(currentDate, range.startDate, range.endDate));
            const isStartDate = isSameDay(checkIn, currentDate);
            const isEndDate = isSameDay(checkOut, currentDate);
            const isWithinRange = isDateInRange(currentDate, checkIn, checkOut);
            newDates.push(
                <li
                    key={`inactive-${i}`}
                    className={`${styles.date} 
           ${!isSelected ? styles.inactive : ''} 
           ${isActiveDay ? styles.today : ''} 
           ${isWithinRange ? styles.selected : ''} 
           ${isStartDate ? styles.startDate : ''} 
           ${isEndDate ? styles.endDate : ''} 
           ${currentDate < today ? styles.disabled : ''}`}
                >
                    {`${i}`}
                </li>
            );
        }

        for (let i = end + 1; i <= 6; i++) {
            newDates.push(
                <li key={`inactive-next-${i}`} className={`${styles.date} ${styles.inactive}`}>
                    {`${i - end}`}
                </li>
            );
        }

        setDates(newDates);
    };

    useEffect(() => {
        renderDates(month1, setDates1);
    }, [month1, year, checkIn, checkOut]);

    useEffect(() => {
        renderDates(month2, setDates2);
    }, [month2, year, checkIn, checkOut]);


    const isDateInRange = (date, startDate, endDate) => {
        const selectedDate = new Date(date);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        return rangeStart && rangeEnd && selectedDate >= rangeStart && selectedDate <= rangeEnd;
    };

    const navigateDates = (nav) => {
        let newMonth1 = month1;
        let newYear = year;

        if (nav === 'prev') {
            newMonth1 = (month1 === 0) ? 11 : month1 - 1;
            newYear = (month1 === 0) ? year - 1 : year;
        } else if (nav === 'next') {
            newMonth1 = (month1 === 11) ? 0 : month1 + 1;
            newYear = (month1 === 11) ? year + 1 : year;
        }

        setMonth1(newMonth1);
        setMonth2(newMonth1 + 1);
        setYear(newYear);
    };

    return (
        <main className={styles.body}>
            <section className={styles.calendarContent}>
                <div className={styles.calendar}>
                    <header>
                        <h3>{`${months[month1]} ${year}`}</h3>
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
                            {dates1}
                        </ul>
                    </section>
                </div>
                <div className={styles.calendar}>
                    <header>
                        <h3>{`${months[month2]} ${year}`}</h3>
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
                            {dates2}
                        </ul>
                    </section>
                </div>
            </section>
        </main>
    );
}

export default BookingCalendar;
