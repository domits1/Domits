import { useState, useEffect } from 'react';

function useFetchAccommodation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const AddressFields = 'Street,PostalCode,Country,City';
  const PreviewFields = 'Title,Description,Images,Rent,Bathrooms,Bedrooms,Beds';


  const fetchAccommodationAddressDetails = async (id) => {
    const url = `https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation/${id}?fields=${encodeURIComponent(AddressFields)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccommodationPreviewDetails = async (id) => {
    const url = `https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation/${id}?fields=${encodeURIComponent(PreviewFields)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setData(data);
    }
    catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    }
    finally {
      setLoading(false);
    }
  };

  return { loading, error, data, fetchAccommodationAddressDetails, fetchAccommodationPreviewDetails };
}

export default useFetchAccommodation;
