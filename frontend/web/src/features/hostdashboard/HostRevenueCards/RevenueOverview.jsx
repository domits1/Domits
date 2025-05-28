import React from 'react';
import './RevenueOverview.scss';

const RevenueOverview = ({ title, value }) => {
    return (
        <div className="ro-revenue-card">
            <h4 className="ro-revenue-title">{title}</h4>
            <p className="ro-revenue-value">{value}</p>
        </div>
    );
};

export default RevenueOverview;