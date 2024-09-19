function iCalFormat(event) {
    const { start, end, summary, description, location, uid, status, stamp,
        checkIn, checkOut, bookingId , accommodationId, lastModified, sequence, guestId } = event;

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domits/Domits Calendar//v1.0//EN
BEGIN:VEVENT
UID:${uid}
SEQUENCE:${sequence}
DTSTAMP:${stamp}
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${description}
Check-In:${checkIn}
Check-Out:${checkOut}
Booking-ID:${bookingId}
LOCATION:${location}
STATUS:${status}
ACCOMMODATION-ID:${accommodationId}
LASTMODIFIED:${lastModified}
GUESTID:${guestId}
END:VEVENT
END:VCALENDAR`;
}

export function formatDate(dateString) {
    const dt = new Date(dateString);
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0];
}

export function formatDescription(description) {
    const desc = description.replace(/\n/g, '\\n');
    return desc;
}

export function formatDateTime(dateTime) {
    const dt = new Date(dateTime);
    return dt.toISOString().replace('T', ' ')
        .split(':').slice(0, 2).join(':').split('.')[0];
}

export function formatLocation(accommodation) {
    if (!accommodation || !accommodation.Street.S || !accommodation.City.S || !accommodation.Country.S) {
        return 'Location data is incomplete';
    }

    const formattedLocation = String(accommodation.Street.S).replace(/,/g, '\\,') + ', ' +
        String(accommodation.City.S).replace(/,/g, '\\,') + ', ' +
        String(accommodation.Country.S).replace(/,/g, '\\,');

    return formattedLocation;
}

export function downloadICal(event) {
    const icsContent = iCalFormat(event);

    const blob = new Blob([icsContent], { type: 'text/calendar' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.summary}.ics`; // The name of the .ics file

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}

const event = {
    uid: '0',
    sequence: '0',
    stamp: '',
    start: '',
    end: '',
    title: 'Placeholder',
    summary: 'Placeholder',
    description: 'Placeholder',
    checkIn: '',
    checkOut: '',
    bookingId: '0',
    location: 'Placeholder',
    status: 'TENTATIVE',
    accommodationId: '0',
    lastModified: '',
    guestId: '0'
};

export default iCalFormat;

console.log(iCalFormat(event));
