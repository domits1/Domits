//This is written by Marijn Klappe
import sortDates from "./sortDates";
import addToDate from "./addToDate";

/**
 * deleteDate is a function that removes a date from the selectedDates
 *
 * @param {[number, number]} date - The date range to be deleted, represented as an array of two numbers.
 * @param {[number,number][]} selectedDates
 */
function deleteDate(date,selectedDates) {
    for (let i = 0; i < selectedDates.length; i++) {
        let v = selectedDates[i];

        if (date[0] > v[0] && date[0] <= v[1] && date[1] >= v[1]) {
            selectedDates[i][1] = addToDate(date[0], -1);
            continue;
        }

        if (date[0] <= v[0] && date[1] >= v[0] && date[1] < v[1]) {
            selectedDates[i][0] = addToDate(date[1], 1);
            continue;
        }

        if (date[0] <= v[0] && date[1] >= v[1]) {
            selectedDates.splice(i, 1);
            i--;
            continue;
        }

        if (date[0] > v[0] && date[1] < v[1]) {
            selectedDates.push([addToDate(date[1], 1), v[1]]);
            selectedDates[i][1] = addToDate(date[0], -1);
            break;
        }
    }

    sortDates(selectedDates);
}

export default deleteDate