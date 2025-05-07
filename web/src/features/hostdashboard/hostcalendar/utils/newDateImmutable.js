import sortDates from "./sortDates"; // Assumes sortDates.js is available

/**
 * newDateImmutable adds a new date range to an array of existing ranges,
 * handling overlaps and merges, returning a new array without modifying the original.
 *
 * @param {Array<[number, number]>} existingDates - The current array of date ranges.
 * @param {[number, number]} rangeToAdd - The new date range [start, end] to add.
 * @returns {Array<[number, number]>} A new array with the date range added and intervals merged/sorted.
 */
function newDateImmutable(existingDates, rangeToAdd) {
  // Create a copy including the new range to avoid modifying the original array
  let workingDates = [...existingDates, rangeToAdd];
  workingDates.sort((a, b) => a[0] - b[0]); // Initial sort by start date

  let mergedDates = [];

  if (workingDates.length === 0) {
    return [];
  }

  // Clone the first interval to ensure immutability
  mergedDates.push([...workingDates[0]]);

  for (let i = 1; i < workingDates.length; i++) {
    let currentRange = workingDates[i];
    let lastMergedRange = mergedDates[mergedDates.length - 1];

    // Check for overlap: if the current range starts before or exactly at the end of the last merged range.
    // Using <= handles both overlap and adjacency directly because YYYYMMDD format is numerically comparable.
    if (currentRange[0] <= lastMergedRange[1]) {
      // Merge: Extend the end of the last merged range if the current range goes further
      lastMergedRange[1] = Math.max(lastMergedRange[1], currentRange[1]);
    } else {
      // No overlap: Add the current range (cloned) as a new, separate merged interval
      mergedDates.push([...currentRange]);
    }
  }

  return mergedDates;
}

export default newDateImmutable;