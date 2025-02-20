import {formatDate, uploadICalToS3} from '../../../../utils/iCalFormatHost.js'
import {generateUUID} from '../../../../utils/generateUUID.js'
import {copyToClipboard} from '../utils/copyToClipboard.js'

export const handleICal = async (accommodations, userId) => {
  let listOfAccommodations = accommodations.flatMap(accommodation =>
    accommodation.DateRanges.L.map(range => {
      let status = accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'
      return {
        UID: generateUUID(),
        Dtstamp: formatDate(new Date()),
        Dtstart: formatDate(new Date(range.M.startDate.S)),
        Dtend: formatDate(new Date(range.M.endDate.S)),
        Summary: `${accommodation.Title.S} - ${status}`,
        Location: `${accommodation.Street.S}, ${accommodation.City.S}, ${accommodation.Country.S}`,
        AccommodationId: accommodation.ID.S,
        OwnerId: accommodation.OwnerId.S,
      }
    }),
  )

  try {
    const uploadURL = await uploadICalToS3(listOfAccommodations, userId)
    if (uploadURL) {
      copyToClipboard(uploadURL)
    } else {
      console.error('Failed to POST iCal data')
    }
  } catch (error) {
    console.error('Failed to POST iCal data:', error)
  }
}
