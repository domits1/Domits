import React, { useEffect, useState } from 'react';
import './OccupancyRate.css';
import GaugeChart from 'react-gauge-chart';
import { FaHome, FaBullseye } from 'react-icons/fa';
import { Auth } from 'aws-amplify';

const OccupancyRateCard = () => {
    const [occupancyRate, setOccupancyRate] = useState(0);
    const [numberOfProperties, setNumberOfProperties] = useState(0);
    const [vsLastMonth, setVsLastMonth] = useState(0);
    const [cognitoUserId, setCognitoUserId] = useState(null);

    useEffect(() => {
        // Fetch the logged-in user's Cognito user ID
        const fetchUser = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setCognitoUserId(userInfo.attributes.sub);  // Get Cognito user ID
            } catch (error) {
                console.error("Error fetching user:", error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        // Fetch occupancy data from the API when the component loads
        fetch('https://cui7ru7r87.execute-api.eu-north-1.amazonaws.com/prod/occupancy')
            .then(response => response.json())
            .then(data => {
                const occupancyData = JSON.parse(data.body).data;
                const currentHostData = occupancyData.find(item => item.hostId === cognitoUserId);

                if (currentHostData) {
                    setOccupancyRate(currentHostData.combinedOccupancyRate / 100);
                    setNumberOfProperties(currentHostData.totalProperties);
                    setVsLastMonth(15);
                }
            })
            .catch(error => console.error('Error fetching data:', error));
    }, [cognitoUserId]);

    // Format the date to "11 November 2024"
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="or-occupancy-rate-card">
            <h4>Occupancy Rate</h4>
            <div className="or-date-picker">{formattedDate}</div>

            <div className="or-occupancy-rate-details">
                <p><FaHome className="or-icon" /> Number of Properties: <strong>{numberOfProperties}</strong></p>
                <p><FaBullseye className="or-icon" /> vs. Last Month: <strong className={vsLastMonth < 0 ? "or-down" : ""}>{vsLastMonth}% {vsLastMonth < 0 ? "↓" : "↑"}</strong></p>

                <div className="or-gauge-wrapper">
                    <GaugeChart
                        id="gauge-chart1"
                        nrOfLevels={100}
                        percent={occupancyRate} // Occupancy rate as a percentage in decimal format
                        colors={['#e0e0e0', '#2c3e50']}
                        arcWidth={0.2}
                        textColor="#000000"
                        cornerRadius={0}
                        needleColor="#2C3E50"
                    />
                    <div className="or-gauge-labels">
                        <span>%0</span>
                        <span>%100</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OccupancyRateCard;