export const MAX_ITEMS_PER_PAGE = 5;

export function pageSlice(list, page, size = MAX_ITEMS_PER_PAGE) {
  return list.slice((page - 1) * size, page * size);
}

export function getTotalPages(listLength, size = MAX_ITEMS_PER_PAGE) {
  return Math.max(1, Math.ceil(listLength / size));
}
