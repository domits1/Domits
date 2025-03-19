import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import './NightsAvailable.css';

const NightsAvailable = () => {
  const [availableNights, setAvailableNights] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
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

        console.log('Fetching accommodations for userId:', userId);

        const accommodationsResponse = await fetch(
          'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Read-AccommodationsByOwner',
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

        if (!accommodationsResponse.ok) {
          const errorText = await accommodationsResponse.text();
          console.error('Accommodations API error:', errorText);
          throw new Error(
            `Accommodations request failed: ${accommodationsResponse.status}`
          );
        }

        const accommodationsData = await accommodationsResponse.json();
        console.log('Accommodations API Response:', accommodationsData);

        if (!accommodationsData.body) {
          throw new Error('No data received from Accommodations API');
        }

        let accommodations;
        try {
          accommodations = JSON.parse(accommodationsData.body);
        } catch (e) {
          console.error('JSON Parse Error (accommodations):', e);
          throw new Error('Invalid accommodations data format');
        }

        if (!Array.isArray(accommodations)) {
          throw new Error('Accommodations data is not an array');
        }

        const activeProperties = accommodations.filter(
          (acc) => !acc.Drafted?.BOOL
        );
        setTotalProperties(activeProperties.length);

        console.log('Fetching available nights for userId:', userId);

        const nightsResponse = await fetch(
          'https://emr2alsh2d.execute-api.eu-north-1.amazonaws.com/prod/Host-Revenues-Production-Read-NightsAvailable',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': idToken,
            },
            body: JSON.stringify({
              periodType: 'custom',
              startDate: '2025-03-01',
              endDate: '2025-03-10',
              hostId: userId,
            }),
          }
        );

        if (!nightsResponse.ok) {
          const errorText = await nightsResponse.text();
          console.error('Nights API error:', errorText);
          throw new Error(
            `Available Nights request failed: ${nightsResponse.status}`
          );
        }

        const nightsData = await nightsResponse.json();
        console.log('Nights API Response:', nightsData);

        if (nightsData.error) {
          throw new Error(nightsData.error);
        }

        if (typeof nightsData.availableNights === 'number') {
          setAvailableNights(nightsData.availableNights);
        } else {
          throw new Error('No "availableNights" in response');
        }
      } catch (err) {
        console.error('Detailed error:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="nights-available-card">
      <div className="nights-available-header">
        <h3>Available Nights</h3>
      </div>

      <div className="nights-available-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="nights-available-details">
            <p className="available-nights-number">
              {availableNights.toLocaleString()}
            </p>
            <p>Active Properties: {totalProperties}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NightsAvailable;
