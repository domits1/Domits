import getCalDays from "./getCalDays";
import getDayClassName from "./getDayClassName";

/**
 * this function returns the month days as an HTML element
 *
 * @param {number} month the month is stored here from 0-11 so 0 is January and 11 is December
 * @param {number} year
 * @returns {Element[]}
 */
function getGridObject(month, year,selectedDates,selectedDate,dayClick) {
    const calDays = getCalDays(month, year);
    const tableData = [];

    for (let i = 0; i < 6; i++) {
        tableData.push(
            <tr>
                {[...Array(7)].map((_, j) => (
                    <td>
                        <a
                            className={getDayClassName(calDays[i * 7 + j].date, [
                                month,
                                year,
                            ],selectedDates,selectedDate)}
                            dateNumber={calDays[i * 7 + j].date}
                            onClick={dayClick}
                            href="#day-click"
                        >
                            {calDays[i * 7 + j].day}
                        </a>
                    </td>
                ))}
            </tr>,
        );
    }

    return tableData;
}

export default getGridObject