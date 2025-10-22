// Updated MonthlyComparison component and integration into HostRevenues

// MonthlyComparison.jsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './MonthlyComparison.scss';

function MonthlyComparison({ data }) {
    return (
        <div className="mc-comparison-card">
            <BarChart
                width={820}
                height={350}
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    tickFormatter={(month) => {
                        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return shortMonths[parseInt(month) - 1] || month;
                    }}
                />
                <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    ticks={[0, 2000, 4000, 6000, 8000]}
                />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="thisYearRevenue" fill="#2E4960" name="This Year" />
                <Bar dataKey="lastYearRevenue" fill="#DDDBDB" name="Last Year" />
            </BarChart>
        </div>
    );
}

export default MonthlyComparison;

