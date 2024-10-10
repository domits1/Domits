import React from 'react';
import './OccupancyRate.css';
import GaugeChart from 'react-gauge-chart';
import { FaHome, FaBullseye } from 'react-icons/fa';

const OccupancyRateCard = () => {
    return (
        <div className="occupancy-rate-card">
            <h4>Occupancy Rate</h4>
            <div className="date-picker">01 May ~ 31 May</div>

            <div className="occupancy-rate-details">
                <p><FaHome className="icon" /> Number of Properties: <strong>12</strong></p>
                <p><FaBullseye className="icon" /> vs. Last Month: <strong className="down">15% ↓</strong></p>

                <div className="gauge-wrapper">
                    <GaugeChart
                        id="gauge-chart1"
                        nrOfLevels={100}
                        percent={0.73}
                        colors={['#e0e0e0', '#2c3e50']}
                        arcWidth={0.2}
                        textColor="#000000"
                        cornerRadius={0}
                        needleColor="#2C3E50"
                    />
                    <div className="gauge-labels">
                        <span>%0</span>
                        <span>%100</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OccupancyRateCard;