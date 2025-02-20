function iCalFormat(event) {
  const {
    Dtstart,
    Dtend,
    Summary,
    Description,
    Location,
    id,
    Status,
    Dtstamp,
    CheckIn,
    CheckOut,
    BookingId,
    AccommodationId,
    LastModified,
    Sequence,
    GuestId,
  } = event

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domits/Domits Calendar//v1.0//EN
BEGIN:VEVENT
UID:${id}
SEQUENCE:${Sequence}
DTSTAMP:${formatICalDateTime(Dtstamp)}
DTSTART:${formatICalDateTime(Dtstart)}
DTEND:${formatICalDateTime(Dtend)}
SUMMARY:${Summary}
DESCRIPTION:${Description}
Check-In:${formatICalDateTime(CheckIn)}
Check-Out:${formatICalDateTime(CheckOut)}
Booking-ID:${BookingId}
LOCATION:${formatLocation(Location)}
STATUS:${Status}
ACCOMMODATION-ID:${AccommodationId}
LASTMODIFIED:${formatICalDateTime(LastModified)}
GUESTID:${GuestId}
END:VEVENT
END:VCALENDAR`
}

export function formatDate(dateString) {
  const dt = new Date(dateString)
  const offset = dt.getTimezoneOffset() // Get timezone offset in minutes
  dt.setMinutes(dt.getMinutes() - offset) // Adjust to local time

  return dt.toISOString().replace(/-/g, '-').split('.')[0]
}

export function formatDescription(description) {
  const desc = description.replace(/\n/g, '\\n')
  return desc.match(/.{1,50}/g).join('\r\n ')
}

export function formatDateTime(dateTime) {
  const dt = new Date(dateTime)
  const offset = dt.getTimezoneOffset() // Get timezone offset in minutes
  dt.setMinutes(dt.getMinutes() - offset) // Adjust to local time
  return dt
    .toISOString()
    .replace('T', ' ')
    .split(':')
    .slice(0, 2)
    .join(':')
    .split('.')[0]
}

export function formatLocation(Location) {
  if (!Location || !Location.Street || !Location.City || !Location.Country) {
    return 'Location data is incomplete'
  }

  const formattedLocation =
    String(Location.Street).replace(/,/g, '\\,') +
    ', ' +
    String(Location.City).replace(/,/g, '\\,') +
    ', ' +
    String(Location.Country).replace(/,/g, '\\,')

  return formattedLocation
}

function formatICalDateTime(dateTime) {
  if (!dateTime || isNaN(new Date(dateTime).getTime())) {
    console.error('Invalid date provided:', dateTime)
    return '' // Return an empty string or handle it based on your use case
  }

  const dt = new Date(dateTime)

  // Format the date and time components manually to preserve local time
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0') // Months are 0-indexed
  const day = String(dt.getDate()).padStart(2, '0')
  const hours = String(dt.getHours()).padStart(2, '0')
  const minutes = String(dt.getMinutes()).padStart(2, '0')
  const seconds = String(dt.getSeconds()).padStart(2, '0')

  const formattedDate = `${year}${month}${day}`
  const formattedTime = `${hours}${minutes}${seconds}`

  return formattedDate + 'T' + formattedTime
}

export function downloadICal(event) {
  const icsContent = iCalFormat(event)

  const blob = new Blob([icsContent], {type: 'text/calendar'})

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${event.Summary}.ics` // The name of the .ics file

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)
}

const event = {
  id: '0',
  Sequence: '0',
  Dtstamp: '',
  Dtstart: '',
  Dtend: '',
  Title: 'Placeholder',
  Summary: 'Placeholder',
  Description: 'Placeholder',
  CheckIn: '',
  CheckOut: '',
  BookingId: '0',
  Location: 'Placeholder',
  Status: 'TENTATIVE',
  AccommodationId: '0',
  lastModified: '',
  GuestId: '0',
}

export default iCalFormat
