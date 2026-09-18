import React from 'react';
import './RevenueOverview.scss';

const RevenueOverview = ({ title, value, icon, variant = 'default' }) => {
    return (
        <div className={`ro-revenue-card ro-revenue-card--${variant}`}>
            {icon && <div className="ro-revenue-icon">{icon}</div>}
            <div className="ro-revenue-text">
                <p className="ro-revenue-value">{value}</p>
                <h4 className="ro-revenue-title">{title}</h4>
            </div>
        </div>
    );
};

export default RevenueOverview;