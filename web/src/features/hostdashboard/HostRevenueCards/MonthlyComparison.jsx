import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import './MonthlyComparison.css'

function MonthlyComparison({data}) {
  return (
    <div className="mc-comparison-card">
      <BarChart
        width={1000}
        height={350}
        data={data}
        margin={{top: 20, right: 30, left: 0, bottom: 0}}>
        <CartesianGrid strokeDasharray="3 3" />

        {/* Format X-Axis to short month names */}
        <XAxis
          dataKey="month"
          tickFormatter={month => {
            const shortMonths = [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ]
            return shortMonths[parseInt(month) - 1] || month // Assuming month is a number (1-12)
          }}
        />

        {/* Format Y-Axis to show values like $0, $2,000, $4,000 */}
        <YAxis
          tickFormatter={value => `$${value.toLocaleString()}`} // Format with $ and thousands separator
          ticks={[0, 2000, 4000, 6000, 8000]} // Manually set tick values
        />

        <Tooltip
          formatter={value => `$${value.toLocaleString()}`} // Tooltip value formatting
        />
        <Legend />

        <Bar dataKey="thisYearRevenue" fill="#2E4960" name="This Year" />
        <Bar dataKey="lastYearRevenue" fill="#DDDBDB" name="Last Year" />
      </BarChart>
    </div>
  )
}

export default MonthlyComparison
