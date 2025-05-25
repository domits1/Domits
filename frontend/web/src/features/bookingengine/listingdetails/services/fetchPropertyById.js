const FetchPropertyById = async (id) => {
  const response = await fetch(
    `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`);
  return await response.json();
};

export default FetchPropertyById;
