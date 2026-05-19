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
        const raw = Array.isArray(hostData) ? hostData[0] : hostData;
        if (!raw) return {};

        const attrs = Array.isArray(raw.Attributes) ? raw.Attributes : [];
        const getAttr = (name) => attrs.find((a) => a.Name === name)?.Value || "";

        return {
            ...raw,
            given_name: getAttr("given_name") || raw.given_name || "",
            family_name: getAttr("family_name") || raw.family_name || "",
            name: getAttr("name") || raw.name || "",
            email: getAttr("email") || raw.email || "",
            profileImage: getAttr("picture") || getAttr("profile") || raw.profileImage || null,
        };
    } catch {
        return {};
    }
};

export default fetchHostInfo;
