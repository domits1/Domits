import React from 'react';
import './RevPAR.css';

const RevPARCard = () => {
    return (
        <div className="rp-revpar-card">
            <h4>RevPAR</h4>
            <div className="rp-revpar-details">
                <p>Occupancy Rate: 73%</p>
                <p>vs. Last Week: 8%</p>
                <p className="rp-revenue-amount">$16,500</p>
                <p>1st - 7th Sep</p>
            </div>
        </div>
    );
};

export default RevPARCard;