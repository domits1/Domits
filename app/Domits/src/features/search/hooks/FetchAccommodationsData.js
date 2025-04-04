import {ToastAndroid} from "react-native";

/**
 * Fetch accommodations data from the backend, format it, and update the state.
 * @param setAccommodationsList - Function to update the list accommodations.
 * @param setLoading - Function to update the loading state.
 * @param formatData - Function to format the fetched data.
 * @returns - Update accommodation list.
 */
const FetchAccommodationsData = async (setAccommodationsList, setLoading, formatData) => {
    try {
        const response = await fetch(
            'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation',
        );
        if (!response.ok) {
            throw new Error('Failed to fetch data: ' + response.statusText);
        }
        const responseData = await response.json();
        const data = JSON.parse(responseData.body);
        setAccommodationsList(formatData(data));
    } catch (error) {
        ToastAndroid.show('An error occurred while attempting to fetch accommodations data.', ToastAndroid.SHORT)
        console.error('Error fetching or processing data:', error);
    } finally {
        setLoading(false);
    }
};

export default FetchAccommodationsData;