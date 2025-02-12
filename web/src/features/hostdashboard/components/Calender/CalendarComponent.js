/**
 * Dies wurde von Marijn Klappe geschrieben
 * 
 * Wenn du nicht verstehst, was hier passiert, dann ändere nichts. Falls etwas angepasst werden muss, kontaktiere mich über Discord --@marijn3--
 */
import React, {useState} from "react";
import leftArrowSVG from './left-arrow-calender.svg';
import rightArrowSVG from './right-arrow-calender.svg';
import './Calendar.scss';

/**
 * 
 * @returns {JSX.Element}
 */
function CalendarComponent({passedProp, isNew, updateDates, componentView}) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedMonthName, setSelectedMonthName] = useState(getMonthName(selectedMonth))
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const [calenderGridObject, setGrid] = useState(getGridObject(selectedMonth,selectedYear));

    /**
     * convertToNumDate ist eine Funktion, die Jahr, Monat und Tag in eine einzige Zahl umwandelt.
     * 
     * @param {number} year
     * @param {number} month Dieser Monat wird von 1-12 gezählt, also 1 ist Januar und 12 ist Dezember.
     * @param {number} day
     * @returns {number} Die Rückgabe hat eine (Jahr-Monat-Tag-Struktur), z. B. 20250112 entspricht dem 12. Januar 2025.
     */
    function convertToNumDate(year, month, day){
        return Number(`${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`);
    }

    /**
     * getCalDays ist eine Funktion, die verwendet wird, um die Tageszahlen des ausgewählten Monats und Jahres zu erhalten.
     * Diese Tage werden genutzt, um die Kalendertage zu füllen.
     * 
     * @param {number} month Der Monat wird hier von 0-11 gespeichert, also 0 ist Januar und 11 ist Dezember.
     * @param {number} year
     * @returns {{date: number, day: number}[]} Das Datum hat eine (Jahr-Monat-Tag-Struktur), z. B. 20250112 entspricht dem 12. Januar 2025.
     */
    function getCalDays(month, year) {
        const dateArray = [];
    
        const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
        const getDayOfWeek = (y, m, d) => (new Date(y, m, d).getDay() + 6) % 7; // 0 ist Montag, 6 ist Sonntag
    
        let prevMonth = (month + 11) % 12;
        let prevYear = month === 0 ? year - 1 : year;
        let nextMonth = (month + 1) % 12;
        let nextYear = month === 11 ? year + 1 : year;
    
        let prevMonthDays = getDaysInMonth(prevYear, prevMonth);
        let prevMonthLastDay = getDayOfWeek(prevYear, prevMonth, prevMonthDays);
        let daysInMonth = getDaysInMonth(year, month);
    
        // Füge die Tage des vorherigen Monats hinzu
        for (let i = prevMonthDays - prevMonthLastDay; i <= prevMonthDays; i++) {
            dateArray.push({ date: convertToNumDate(prevYear, prevMonth + 1, i), day: i });
        }
    
        // Füge die Tage des aktuellen Monats hinzu
        for (let i = 1; i <= daysInMonth; i++) {
            dateArray.push({ date: convertToNumDate(year, month + 1, i), day: i });
        }
    
        let remainingDays = 42 - dateArray.length; // Stellt sicher, dass der Kalender immer 6 Wochen zeigt
    
        // Füge die Tage des nächsten Monats hinzu
        for (let i = 1; i <= remainingDays; i++) {
            dateArray.push({ date: convertToNumDate(nextYear, nextMonth + 1, i), day: i });
        }
    
        return dateArray;
    }

    /**
     * Diese Funktion behandelt die Interaktion, wenn auf einen Tag geklickt wird. Sie wählt ein neues Datum aus.
     * 
     * @param {MouseEvent} e
     */
    function dayClick(e){
        e.preventDefault()
        const anchorElement = e.currentTarget
        let date = Number(anchorElement.getAttribute("dateNumber"))

        console.log(date)
    }

    /**
     * Diese Funktion gibt die Monatstage als HTML-Element zurück.
     * 
     * @param {number} month Der Monat wird hier von 0-11 gespeichert, also 0 ist Januar und 11 ist Dezember.
     * @param {number} year
     * @returns {Element[]}
     */
    function getGridObject(month,year){
        console.log(month,year);
        const calDays = getCalDays(month,year)
        const tableData = [];
        
        for(let i = 0; i < 6; i++){
            tableData.push(
                <tr>
                    {[...Array(7)].map((_, j) => (
                        <td><a 
                            dateNumber={calDays[i*7+j].date} 
                            onClick={dayClick}
                            href="">{calDays[i*7+j].day}</a></td>
                    ))}
                </tr>
            )
        }

        return tableData;
    }

    return(
        <div className="calender-container">
            <div className="calender">
                <div className="column">
                    <div className="header">
                        <h4>{selectedMonthName} {selectedYear}</h4>
                        <div className="btn-container">
                            <a href="" onClick={previusMonthBtn}>
                                <img src={leftArrowSVG} alt="" />
                            </a>
                            <a href="" onClick={nextMonthBtn}>
                                <img src={rightArrowSVG} alt="" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CalendarComponent;
