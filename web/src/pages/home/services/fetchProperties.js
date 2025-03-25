export const FetchAllPropertyTypes = async () => {
    const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property");
    if (!response.ok) {
        throw new Error(`Something went wrong while fetching AllPropertyTypes: ${response}`);
    }
    return await response.json();
}

export const FetchPropertyType = async (type) => {
    const response = await fetch(`https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property?type=${type}`);
    if (!response.ok) {
        throw new Error(`Something went wrong while fetching PropertyType: ${response}`);
    }
    return await response.json();
}