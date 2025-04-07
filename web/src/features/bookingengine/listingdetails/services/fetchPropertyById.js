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
    const property = await response.json();
    console.log(property);
    setProperty(property);
}

export default FetchPropertyById;