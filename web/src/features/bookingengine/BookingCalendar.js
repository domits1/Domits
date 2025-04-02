import React, { useEffect, useState } from "react";
import styles from './styles/BookingCalendar.module.css';
import { isSameDay } from "date-fns";

function BookingCalendar({ passedProp, checkIn, checkOut, onCheckInChange, onCheckOutChange, checkInFilter, checkOutFilter }) {
    const [month1, setMonth1] = useState(new Date().getMonth());
    const [month2, setMonth2] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [dates1, setDates1] = useState([]);
    const [dates2, setDates2] = useState([]);

    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    const isDateInRange = (date, startDate, endDate) => {
        const selectedDate = new Date(date);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        return rangeStart && rangeEnd && selectedDate >= rangeStart && selectedDate <= rangeEnd;
    };

    const handleDateClick = (date) => {
        if (!checkIn || (checkIn && checkOut)) {
            if (checkInFilter(date)) {
                onCheckInChange(date);
                onCheckOutChange(null);
            }
        } else if (checkIn && !checkOut && date > checkIn) {
            const minStayDate = normalizeDate(new Date(checkIn));
            minStayDate.setDate(minStayDate.getDate() + passedProp.MinimumStay);
            minStayDate.setHours(0, 0, 0, 0);

            if (checkOutFilter(date) && date >= minStayDate) {
                onCheckOutChange(date);
            } else {
                console.warn(`Minimum stay is ${passedProp.MinimumStay} nights.`);
            }
        } else {
            if (checkInFilter(date)) {
                onCheckInChange(date);
                onCheckOutChange(null);
            }
        }
    };

    const normalizeDate = (date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    };

    function renderDates(month, setDates, filter) {
        const today = normalizeDate(new Date());
        const start = new Date(year, month, 1).getDay();
        const endDate = new Date(year, month + 1, 0).getDate();
        const end = new Date(year, month, endDate).getDay();
        const endDatePrev = new Date(year, month, 0).getDate();
        const newDates = [];

        for (let i = start; i > 0; i--) {
            newDates.push(
                <li
                    key={`inactive-prev-${endDatePrev - i + 1}`}
                    className={`${styles.date} ${styles.inactive}`}
                >
                    {`${endDatePrev - i + 1}`}
                </li>
            );
        }

        for (let i = 1; i <= endDate; i++) {
            const currentDate = normalizeDate(new Date(year, month, i));
            const isPastDate = currentDate < today;

            let isOutsideAdvanceRange = false;

            if (checkIn === null && checkOut === null) {
                const minAdvanceReservation = normalizeDate(new Date());
                minAdvanceReservation.setDate(today.getDate() + passedProp.MinimumAdvanceReservation);
                minAdvanceReservation.setHours(0, 0, 0, 0);

                const maxAdvanceReservation = normalizeDate(new Date());
                maxAdvanceReservation.setDate(today.getDate() + passedProp.MaximumAdvanceReservation);
                maxAdvanceReservation.setHours(0, 0, 0, 0);

                isOutsideAdvanceRange = currentDate < minAdvanceReservation || currentDate > maxAdvanceReservation;
            } else if (checkIn !== null) {
                const minStayDate = normalizeDate(new Date(checkIn));
                minStayDate.setDate(minStayDate.getDate() + passedProp.MinimumStay);
                minStayDate.setHours(0, 0, 0, 0);

                const maxStayDate = normalizeDate(new Date(checkIn));
                maxStayDate.setDate(maxStayDate.getDate() + passedProp.MaximumStay);
                maxStayDate.setHours(0, 0, 0, 0);

                isOutsideAdvanceRange = currentDate < minStayDate || currentDate > maxStayDate;
            }

            let isFiltered = false;
            let isStartDate = false;
            let isEndDate = false;
            let isWithinRange = false;

            if (passedProp.MinimumStay === 0 && passedProp.MaximumStay === 0 && passedProp.MinimumAdvanceReservation === 0 && passedProp.MaximumAdvanceReservation === 0) {
                isFiltered = isPastDate || !filter(currentDate);
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else if (
                passedProp.MinimumStay !== 0 &&
                passedProp.MaximumStay === 0 &&
                passedProp.MinimumAdvanceReservation === 0 &&
                passedProp.MaximumAdvanceReservation === 0
            ) {
                const minStayDate = normalizeDate(new Date(checkIn));
                minStayDate.setDate(minStayDate.getDate() + passedProp.MinimumStay);

                isFiltered = isPastDate || currentDate < minStayDate || !filter(currentDate);
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else if (
                passedProp.MinimumStay === 0 &&
                passedProp.MaximumStay !== 0 &&
                passedProp.MinimumAdvanceReservation === 0 &&
                passedProp.MaximumAdvanceReservation === 0
            ) {
                const maxStayDate = normalizeDate(new Date(checkIn));
                maxStayDate.setDate(maxStayDate.getDate() + passedProp.MaximumStay);

                if (checkIn !== null) {
                    isFiltered = isPastDate || currentDate > maxStayDate || !filter(currentDate) || checkIn > currentDate;
                } else {
                    isFiltered = isPastDate || currentDate < maxStayDate || !filter(currentDate);
                }
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else if (
                passedProp.MinimumStay !== 0 &&
                passedProp.MaximumStay !== 0 &&
                passedProp.MinimumAdvanceReservation === 0 &&
                passedProp.MaximumAdvanceReservation === 0
            ) {
                const minStayDate = normalizeDate(new Date(checkIn));
                minStayDate.setDate(minStayDate.getDate() + passedProp.MinimumStay);

                const maxStayDate = normalizeDate(new Date(checkIn));
                maxStayDate.setDate(maxStayDate.getDate() + passedProp.MaximumStay);

                if (checkIn !== null) {
                    isFiltered =
                        isPastDate ||
                        currentDate < minStayDate ||
                        currentDate > maxStayDate ||
                        !filter(currentDate) ||
                        currentDate <= checkIn;
                } else {
                    isFiltered = isPastDate || !filter(currentDate);
                }

                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else if (
                passedProp.MinimumStay === 0 &&
                passedProp.MaximumStay === 0 &&
                passedProp.MinimumAdvanceReservation !== 0 &&
                passedProp.MaximumAdvanceReservation === 0
            ) {
                const minAdvanceDate = normalizeDate(new Date());
                minAdvanceDate.setDate(today.getDate() + passedProp.MinimumAdvanceReservation);

                isFiltered = isPastDate || currentDate < minAdvanceDate || !filter(currentDate);
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else if (
                passedProp.MinimumStay === 0 &&
                passedProp.MaximumStay === 0 &&
                passedProp.MinimumAdvanceReservation === 0 &&
                passedProp.MaximumAdvanceReservation !== 0
            ) {
                const maxAdvanceDate = normalizeDate(new Date());
                maxAdvanceDate.setDate(today.getDate() + passedProp.MaximumAdvanceReservation);

                isFiltered = isPastDate || currentDate > maxAdvanceDate || !filter(currentDate);
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            } else {
                isFiltered = isPastDate || isOutsideAdvanceRange;
                isStartDate = isSameDay(checkIn, currentDate);
                isEndDate = isSameDay(checkOut, currentDate);
                isWithinRange = checkIn && checkOut && isDateInRange(currentDate, checkIn, checkOut);
            }

            newDates.push(
                <li
                    key={`date-${i}`}
                    className={`${styles.date}
                ${isFiltered ? styles.inactive : ''}
                ${isStartDate ? styles.startDate : ''}
                ${isEndDate ? styles.endDate : ''}
                ${isWithinRange ? styles.selected : ''}`}
                    onClick={() => !isFiltered && handleDateClick(currentDate)}
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
    }

    useEffect(() => {
        renderDates(month1, setDates1, checkInFilter);
    }, [month1, year, checkIn, checkOut]);

    useEffect(() => {
        renderDates(month2, setDates2, checkOutFilter);
    }, [month2, year, checkIn, checkOut]);

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
