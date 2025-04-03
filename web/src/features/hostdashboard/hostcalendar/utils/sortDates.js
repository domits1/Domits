//This is written by Marijn Klappe

/**
 * this function sorts the dates in the selectedDates array
 *
 * @param {[number,number][]} selectedDates
 */
function sortDates(selectedDates) {
    selectedDates.sort((a, b) => a[0] - b[0]);
}

export default sortDates