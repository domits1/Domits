import retrieveAccessToken from '../../features/auth/RetrieveAccessToken';

class PropertyRepository {
  constructor() {}

  async fetchPropertyDetails(id) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`,
    );
    if (!response.ok) {
      throw new Error('Something went wrong while fetching property details.');
    }
    return await response.json();
  }

  async fetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=${lastEvaluatedKeyCreatedAt}&lastEvaluatedKeyId=${lastEvaluatedKeyId}`,
    );
    if (!response.ok) {
      throw new Error('Something went wrong while fetching properties.');
    }
    return await response.json();
  }

  async fetchPropertyByCountry(
    country,
    lastEvaluatedKeyId,
    lastEvaluatedKeyCity,
  ) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byCountry?country=${country}&lastEvaluatedKeyId=${lastEvaluatedKeyId}&lastEvaluatedKeyCity=${lastEvaluatedKeyCity}`,
    );
    if (!response.ok) {
      throw new Error(
        'Something went wrong while fetching properties by country.',
      );
    }
    return await response.json();
  }

  async fetchPropertyByBookingId(bookingId) {
      const response = await fetch(
        `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/booking?bookingId=${bookingId}`,
        {
          method: 'GET',
          headers: {
            Authorization: await retrieveAccessToken(),
          },
        },
      );
      if (!response.ok) {
        throw new Error("Something went wrong while fetching property matching your booking.");
      }
      return await response.json();
  }

  async getPropertiesList(properties) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${properties.join(
        ',',
      )}`,
      {
        method: 'GET',
      },
    );
    if (!response.ok) {
      throw new Error('Something went wrong while fetching properties.');
    }
    return await response.json();
  }
}

export default PropertyRepository;
