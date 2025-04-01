/**
 * Fetch the owner data by a given id.
 * @param ownerId - The id of the owner to be fetched.
 * @param setOwner - Function to set the owner.
 * @returns - Update the owner.
 */
const FetchOwnerData = async (ownerId, setOwner) => {
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
                body: JSON.stringify({UserId: ownerId}),
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

        const parsedBody =
            typeof responseData.body === 'string'
                ? JSON.parse(responseData.body)
                : responseData.body;
        const formattedData = transformRawUserData(parsedBody)

        setOwner(formattedData)

    } catch (error) {
        console.error('Error fetching owner data:', error);
    }
};

/**
 * Transform host user data to object.
 * Helper function for GetUserInfo lambda function before DB refactor (March 2025)
 * @param data - Raw host user data
 * @returns object
 */
const transformRawUserData = (data) => {
    if (!data || data.length === 0) return null; // Handle empty case
    const user = data[0];

    const attributesObject = user.Attributes.reduce((acc, attr) => {
        acc[attr.Name] = attr.Value;
        return acc;
    }, {});

    return {...user, ...attributesObject, Attributes: undefined};
};

export default FetchOwnerData;