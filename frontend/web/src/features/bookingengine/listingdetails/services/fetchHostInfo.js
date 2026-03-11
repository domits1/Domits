const fetchHostInfo = async (ownerId) => {
    try {
        const requestData = {
            UserId: ownerId
        };
        const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) {
            return {};
        }
        const responseData = await response.json();
        const hostData = JSON.parse(responseData.body);
        return hostData;
    } catch {
        return {};
    }
};

export default fetchHostInfo;
