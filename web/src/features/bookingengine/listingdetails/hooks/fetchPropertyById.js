const FetchPropertyById = async (setProperty, id) => {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property?property=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    setProperty(await response.json());
}

export default FetchPropertyById;