/**
 * Fetch the current accommodation data by a given id.
 * @param accommodationId - The id of the accommodation to be fetched.
 * @param setAccommodation - Function to set the current accommodation data.
 * @param setLoading - Function to update the loading state.
 * @returns {Promise<void>}
 * @constructor
 */
const FetchAccommodation = async (accommodationId, setAccommodation, setLoading) => {
    try {
        const response = await fetch(
            'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ID: accommodationId}),
            },
        );
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();

        const parsedBody =
            typeof responseData.body === 'string'
                ? JSON.parse(responseData.body)
                : responseData.body;
        setAccommodation(parsedBody);
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    } finally {
        setLoading(false);
    }
};

export default FetchAccommodation;