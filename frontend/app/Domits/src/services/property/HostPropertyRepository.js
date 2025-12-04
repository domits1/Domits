import retrieveAccessToken from "../../features/auth/RetrieveAccessToken";

/**
 * API calls specific to host users
 */

class HostPropertyRepository {
  constructor() {}

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
      throw new Error('Failed to fetch');
    }
    return await response.json();
  }
}

export default HostPropertyRepository;