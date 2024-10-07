import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './MonthlyComparison.css';

function MonthlyComparison({ data }) {
    return (
        <div className="comparison-card">
            <div className="card-header">
                <span>Monthly Comparison</span>

            </div>
            <BarChart
                width={800}
                height={300}
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="thisWeek" fill="#2E4960" name="This Week" />
                <Bar dataKey="lastWeek" fill="#DDDBDB" name="Last Week" />
            </BarChart>
        </div>
    );
}

export default MonthlyComparison;