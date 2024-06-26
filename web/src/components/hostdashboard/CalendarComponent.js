import React, {useEffect, useState} from "react";
import spinner from "../../images/spinnner.gif";
import styles from './Calendar.module.css';


function CalendarComponent() {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [dates, setDates] = useState([]);

    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];
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
            const isActiveDay = i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            newDates.push(
                <li key={`active-${i}`} className={isActiveDay ? styles.today : ''}>
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

    useEffect(() => {
        renderDates();
    }, [month, year]);

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
        </main>
    );
}

export default CalendarComponent;
