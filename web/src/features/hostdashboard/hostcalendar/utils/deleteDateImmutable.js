import addToDate from "./addToDate"; // Assumes addToDate.js is available
import sortDates from "./sortDates"; // Assumes sortDates.js is available

/**
 * deleteDateImmutable removes a date range from an array of existing ranges,
 * handling partial overlaps and splits, returning a new array.
 *
 * @param {Array<[number, number]>} existingDates - The current array of date ranges.
 * @param {[number, number]} rangeToDelete - The date range [start, end] to delete.
 * @returns {Array<[number, number]>} A new array with the date range removed.
 */
function deleteDateImmutable(existingDates, rangeToDelete) {
  let resultingDates = [];
  const [deleteStart, deleteEnd] = rangeToDelete;

  existingDates.forEach(currentRange => {
    const [currentStart, currentEnd] = currentRange;

    // Case 1: No overlap - the current range is completely before or after the deleted range
    if (currentEnd < deleteStart || currentStart > deleteEnd) {
      resultingDates.push([...currentRange]); // Keep the range as is (cloned)
      return; // Move to the next range in forEach
    }

    // Case 2: Full overlap - the deleted range completely covers the current range
    if (deleteStart <= currentStart && deleteEnd >= currentEnd) {
      // Discard the current range, do nothing
      return; // Move to the next range in forEach
    }

    // Case 3: Partial overlap - deleted range cuts off the end of the current range
    // Check if the beginning part actually exists (currentStart < deleteStart)
    if (currentStart < deleteStart) {
      resultingDates.push([currentStart, addToDate(deleteStart, -1)]);
    }

    // Case 4: Partial overlap - deleted range cuts off the beginning of the current range
    // Check if the ending part actually exists (currentEnd > deleteEnd)
    if (currentEnd > deleteEnd) {
      resultingDates.push([addToDate(deleteEnd, 1), currentEnd]);
    }

    // Note: Cases 3 & 4 combined handle the 'Split' scenario implicitly.
    // If deleteStart > currentStart AND deleteEnd < currentEnd, both conditions above will trigger,
    // creating the two resulting sub-ranges correctly.
  });

  // Sort the resulting dates as splits might create out-of-order ranges
  sortDates(resultingDates);

  // It's generally NOT necessary to merge after deletion unless specifically required.
  // Deletion might create gaps, which is usually the desired outcome.

  return resultingDates;
}

export default deleteDateImmutable;