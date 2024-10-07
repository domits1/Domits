import React from 'react';
import './RevenueOverview.css';

const RevenueOverview = ({ title, value }) => {
    return (
        <div className="revenue-card">
            <h4>{title}</h4>
            <p>{value}</p>
        </div>
    );
};

export default RevenueOverview;