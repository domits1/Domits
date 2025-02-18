/**
 * Fetch the owner data by a given id.
 * @param ownerId - The id of the owner to be fetched.
 * @param setOwner - Function to set the owner.
 * @returns {Promise<void>} - A promise that resolves when the fetch is completed.
 * @constructor
 */
const FetchOwner = async (ownerId, setOwner) => {
    if (!ownerId) {
        return;
    }

    try {
        const response = await fetch(
            'https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({OwnerId: ownerId}),
            },
        );
        if (!response.ok) {
            throw new Error('Failed to fetch owner data');
        }
        const responseData = await response.json();
        const data = responseData.body ? JSON.parse(responseData.body) : null;
        if (!data) {
            console.error('No data found in response body');
            return;
        }

        const attributesObject = data[0].Attributes.reduce((acc, attr) => {
            acc[attr.Name] = attr.Value;
            return acc;
        }, {});
        setOwner(
            attributesObject.given_name + ' ' + attributesObject.family_name ||
            'Unknown Host',
        );
    } catch (error) {
        console.error('Error fetching owner data:', error);
    }
};

export default FetchOwner;