import React, {useCallback, useEffect, useState} from "react";
import styles from './Calendar.module.css';
import {isSameDay} from "date-fns";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import {useNavigate} from "react-router-dom";

/**
 * TEST
 * @param passedProp
 * @param isNew
 * @param updateDates
 * @returns {Element}
 * @constructor
 */
function CalendarComponent({passedProp, isNew, updateDates}) {
    const navigate = useNavigate();
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [dates, setDates] = useState([]);
    const [selectedRanges, setSelectedRanges] = useState([]);
    const [originalRanges, setOriginalRanges] = useState([]);
    let [dateRange, setDateRange] = useState({
        startDate: null,
        endDate: null
    });

    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    const [minimumStay, setMinimumStay] = useState(passedProp.MinimumStay || 0);
    const [minimumAdvancedReservation, setMinimumAdvancedReservation] = useState(passedProp.MinimumAdvancedReservation || 0);
    const [maximumStay, setMaximumStay] = useState(passedProp.MaximumStay || 0);
    const [maximumAdvancedReservation, setMaximumAdvancedReservation] = useState(passedProp.MaximumAdvancedReservation || 0);
    const [originalMinimumStay, setOriginalMinimumStay] = useState(passedProp.MinimumStay || 0);
    const [originalMinimumAdvancedReservation, setOriginalMinimumAdvancedReservation] = useState(passedProp.MinimumAdvancedReservation || 0);
    const [originalMaximumStay, setOriginalMaximumStay] = useState(passedProp.MaximumStay || 0);
    const [originalMaximumAdvancedReservation, setOriginalMaximumAdvancedReservation] = useState(passedProp.MaximumAdvancedReservation || 0);

    useEffect(() => {
        if (passedProp && passedProp.DateRanges) {
            setSelectedRanges(passedProp.DateRanges);
            setOriginalRanges(passedProp.DateRanges);
            setMinimumStay(passedProp.MinimumStay || 0);
            setMinimumAdvancedReservation(passedProp.MinimumAdvancedReservation || 0);
            setMaximumStay(passedProp.MaximumStay || 0);
            setMaximumAdvancedReservation(passedProp.MaximumAdvancedReservation || 0);
        }
    }, [passedProp.ID, passedProp.DateRanges, passedProp.MinimumStay, passedProp.MinimumAdvancedReservation, passedProp.MaximumStay, passedProp.MaximumAdvancedReservation]);
    useEffect(() => {
        if (passedProp && passedProp.DateRanges) {
            setOriginalRanges(passedProp.DateRanges);
        }
    }, [passedProp.ID]);

    const incrementAmount = (setter, value, limit) => {
        setter(prev => (prev < limit ? prev + 1 : prev));
    };

    const decrementAmount = (setter, value, minimum = 0) => {
        setter(prev => (prev > minimum ? prev - 1 : prev));
    };

    const renderDates = () => {
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
            const isSelected = selectedRanges.some(range => isDateInRange(currentDate, range.startDate, range.endDate));
            const isStartDate = selectedRanges.some(range => isSameDay(range.startDate, currentDate));
            const isEndDate = selectedRanges.some(range => isSameDay(range.endDate, currentDate));
            newDates.push(
                <li
                    key={`active-${i}`}
                    className={`${styles.date} ${isActiveDay ? styles.today : ''} 
                            ${isSelected ? styles.selected : ''} 
                            ${isStartDate ? styles.startDate : ''} 
                            ${isEndDate ? styles.endDate : ''} 
                            ${currentDate < today ? styles.disabled : ''}`}
                    onClick={() => handleDateClick(currentDate)}
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

    const dateRangesOverlap = (range1, range2) => {
        const {startDate: start1, endDate: end1} = range1;
        const {startDate: start2, endDate: end2} = range2;

        return (
            (start1 <= start2 && (end1 === null || start2 <= end1)) ||
            (start1 <= end2 && (end1 === null || end2 <= end1)) ||
            (start2 <= start1 && (end2 === null || start1 <= end2)) ||
            (start2 <= end1 && (end2 === null || end1 <= end2))
        );
    };


    useEffect(() => {
        renderDates();
    }, [month, year, selectedRanges]);

    const handleDateClick = (dateClicked) => {
        const clickedDate = new Date(dateClicked);

        if (clickedDate >= new Date()) {
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
                        newDateRange = {
                            startDate: clickedDate,
                            endDate: newDateRange.startDate
                        };
                    }

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

                    updateDates([...selectedRanges, newDateRange]);

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
        }
    };


    const isDateInRange = (date, startDate, endDate) => {
        const selectedDate = new Date(date);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        return rangeStart && rangeEnd && selectedDate >= rangeStart && selectedDate <= rangeEnd;
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

    const asyncSaveDates = async () => {
        const body = {
            DateRanges: selectedRanges,
            MinimumStay: minimumStay,
            MinimumAdvancedReservation: minimumAdvancedReservation,
            MaximumStay: maximumStay,
            MaximumAdvancedReservation: maximumAdvancedReservation,
            ID: passedProp.ID
        };

        console.log(body);
        try {
            const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationStayParameters', {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
            if (!response.ok) {
                alert("Something went wrong, please try again later...");
                throw new Error('Failed to fetch');
            } else {
                const data = await response.json();
                const jsonData = JSON.parse(data.body);
                if (jsonData.updatedAttributes) {
                    const updatedAttributes = jsonData.updatedAttributes;
                    passedProp.DateRanges = updatedAttributes.DateRanges;
                    alert("Update successful!");
                } else {
                    alert("Something went wrong, please try again later...");
                    console.log("updatedAttributes is missing in the response");
                }
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            navigate("/hostdashboard/listings");
        }
    };

    const handleRemoveDateRange = (indexToRemove) => {
        setSelectedRanges(prevSelectedRanges => {
            const updatedRanges = [...prevSelectedRanges];
            updatedRanges.splice(indexToRemove, 1);
            updateDates(updatedRanges);
            return updatedRanges;
        });
    };

    const handleUndo = () => {
        setSelectedRanges(originalRanges);
        setMinimumStay(originalMinimumStay);
        setMinimumAdvancedReservation(originalMinimumAdvancedReservation);
        setMaximumStay(originalMaximumStay);
        setMaximumAdvancedReservation(originalMaximumAdvancedReservation);
    }

    return (
        <main className={styles.body}>
            <section className={styles.calendarContent}>
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
                                <button className={styles.removeButton} onClick={() => handleRemoveDateRange(index)}>x
                                </button>
                            </div>
                        )) : <div>Start by selecting your date range</div>}
                    </section>
                </div>
                <section>
                    <div className={styles.staying_nights}>
                        <div className={styles.stayMinMaxBox}>
                            <div className={styles.stayMinMaxField}>
                                <label className={styles.minMaxLabel}>Minimum Stay (Days):</label>
                                <div className={styles.minMaxButtons}>
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => decrementAmount(setMinimumStay, minimumStay)}
                                    >
                                        -
                                    </button>
                                    {minimumStay}
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => incrementAmount(setMinimumStay, minimumStay, 30)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className={styles.stayMinMaxField}>
                                <label className={styles.minMaxLabel}>Minimum Booking Period (Days):</label>
                                <div className={styles.minMaxButtons}>
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => decrementAmount(setMinimumAdvancedReservation, minimumAdvancedReservation)}
                                    >
                                        -
                                    </button>
                                    {minimumAdvancedReservation}
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => incrementAmount(setMinimumAdvancedReservation, minimumAdvancedReservation, 30)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className={styles.stayMinMaxField}>
                                <label className={styles.minMaxLabel}>Maximum Stay (Days):</label>
                                <div className={styles.minMaxButtons}>
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => decrementAmount(setMaximumStay, maximumStay, minimumStay)}
                                    >
                                        -
                                    </button>
                                    {maximumStay}
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => incrementAmount(setMaximumStay, maximumStay, 365)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className={styles.stayMinMaxField}>
                                <label className={styles.minMaxLabel}>Maximum Advanced Reservation (Days):</label>
                                <div className={styles.minMaxButtons}>
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => decrementAmount(setMaximumAdvancedReservation, maximumAdvancedReservation, minimumAdvancedReservation)}
                                    >
                                        -
                                    </button>
                                    {maximumAdvancedReservation}
                                    <button
                                        className={styles.roundButton}
                                        onClick={() => incrementAmount(setMaximumAdvancedReservation, maximumAdvancedReservation, 365)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </section>
            {!isNew && <section className={styles.buttonBox}>
                <button className={styles.undo} onClick={() => handleUndo()}>Undo</button>
                <button className={styles.save} onClick={() => asyncSaveDates()}>Save</button>
            </section>}
        </main>
    );
}

export default CalendarComponent;
