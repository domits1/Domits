import retrieveAccessToken from "../../features/auth/RetrieveAccessToken";

/**
 * API calls specific to host users
 */

class HostPropertyRepository {
  constructor() {
  }

  /**
   * Create new property as 'INACTIVE'
   */
  async createProperty(property) {
    const payload = typeof property === "string" ? property : JSON.stringify(property);
    const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "application/json",
        Authorization: await retrieveAccessToken(),
      },
    });
    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(errorMessage)
      throw new Error('Failed to create a property');
    } else return await response.text();
  }

  /**
   * Get all properties from current host user
   */
  async fetchAllHostProperties() {
    const response = await fetch(
      "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
      {
        method: "GET",
        headers: {
          Authorization: await retrieveAccessToken(),
        },
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch property');
    }
    return await response.json();
  }

  /**
   * Update property status from DRAFT to LIVE.
   */
  async updatePropertyStatus(propertyId) {
    const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
      method: "PATCH",
      body: JSON.stringify({property: propertyId}),
      headers: {
        Authorization: await retrieveAccessToken(),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to update property status');
    }
  }
}

export default HostPropertyRepository;