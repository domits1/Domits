import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import './ALOSCard.scss';

const ALOSCard = () => {
  const [averageLengthOfStay, setAverageLengthOfStay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) {
          throw new Error('User ID not found');
        }
        const userId = userInfo.attributes.sub;

        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken(); 


        const response = await fetch(
          'https://wsoz1pj35e.execute-api.eu-north-1.amazonaws.com/default/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': idToken,
            },
            body: JSON.stringify({ UserId: userId })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', errorText);
          throw new Error(
            `Request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (!data.body) {
          throw new Error('No data received from API');
        }

        let parsedData;
        try {
          parsedData = JSON.parse(data.body);
        } catch (e) {
          console.error('JSON Parse Error:', e);
          throw new Error('Invalid data format');
        }

        if (typeof parsedData.averageLengthOfStay !== 'number') {
          throw new Error('Invalid average length of stay data');
        }

        setAverageLengthOfStay(parsedData.averageLengthOfStay);
      } catch (error) {
        console.error('Error fetching average length of stay:', error);
        setError(error.message || 'An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="alos-card">
      <h3>Average Length of Stay</h3>
      <div className="alos-details">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <p>{averageLengthOfStay} nights</p>
        )}
      </div>
    </div>
  );
};

export default ALOSCard;

