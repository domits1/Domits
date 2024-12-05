function DateFormatterYYYY_MM_DD(isoDateString) {
  const date = new Date(isoDateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default DateFormatterYYYY_MM_DD;
