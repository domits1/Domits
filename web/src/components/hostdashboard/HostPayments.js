import React, { useState, useEffect } from 'react';
import Pages from './Pages';
import './HostReports.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function HostReports() {
    const [revenueData, setRevenueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDates, setSelectedDates] = useState({
        journalEntries: new Date(),
        balanceSheets: new Date(),
        incomeStatements: new Date(),
        waterfallCharts: new Date(),
        arAgeingReports: new Date(),
    });

    useEffect(() => {
        const fetchRevenueData = async () => {
            try {
                const data = {
                    available: [{ amount: 5000 }],
                    pending: [{ amount: 3000 }],
                };
                const formattedData = {
                    recognized_revenue: data.available[0].amount,
                    deferred_revenue: data.pending[0].amount,
                    waterfall: [
                        { month: 'May 2023', total: 10000, recognized: 5000, remaining: 5000 },
                        { month: 'Jun 2023', total: 15000, recognized: 7000, remaining: 8000 },
                    ],
                };
                setRevenueData(formattedData);
                setLoading(false);
            } catch (error) {
                setError(error.message);
                setLoading(false);
            }
        };

        fetchRevenueData();
    }, []);

    const handleDateChange = (reportType, date) => {
        setSelectedDates(prevDates => ({
            ...prevDates,
            [reportType]: date,
        }));
    };

    const handleExport = (reportType) => {
        const month = selectedDates[reportType].toLocaleString('default', { month: 'long' });
        const year = selectedDates[reportType].getFullYear();
        alert(`Exporting ${reportType} data for ${month} ${year}`);
    };

    return (
        <div className="container">

            <div className="dashboard">
                <div className="tabsContainer">
                    <Pages />
                </div>
                <div className="contentContainer">
                    {loading && <p>Loading data...</p>}
                    {error && <p>Error loading data: {error}</p>}
                    {revenueData && (
                        <div className="reportsSection">
                            <h2>Reports</h2>
                            <div className="overview">
                                <h3>Revenue Overview</h3>
                                <div className="chart">
                                    <p>Recognized revenue and deferred revenue over time</p>
                                </div>
                                <div className="summary">
                                    <h4>May Summary</h4>
                                    <p>Recognized revenue: ${revenueData.recognized_revenue / 100}</p>
                                    <p>Deferred revenue: ${revenueData.deferred_revenue / 100}</p>
                                </div>
                            </div>
                            <div className="waterfall">
                                <h3>Revenue Waterfall</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Total</th>
                                            <th>Recognized</th>
                                            <th>Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revenueData.waterfall.map((row, index) => (
                                            <tr key={index}>
                                                <td>{row.month}</td>
                                                <td>${row.total}</td>
                                                <td>${row.recognized}</td>
                                                <td>${row.remaining}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="reportBox">
                                <h4>Debits and Credits Journal Entries</h4>
                                <p>Export detailed journal entries for all debits and credits...</p>
                                <DatePicker
                                    selected={selectedDates.journalEntries}
                                    onChange={(date) => handleDateChange('journalEntries', date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                />
                                <button className="exportButton" onClick={() => handleExport('journalEntries')}>Export</button>
                            </div>
                            <div className="reportBox">
                                <h4>Balance Sheets</h4>
                                <p>Get comprehensive balance sheets for your business...</p>
                                <DatePicker
                                    selected={selectedDates.balanceSheets}
                                    onChange={(date) => handleDateChange('balanceSheets', date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                />
                                <button className="exportButton" onClick={() => handleExport('balanceSheets')}>Export</button>
                            </div>
                            <div className="reportBox">
                                <h4>Income Statements</h4>
                                <p>Generate detailed income statements...</p>
                                <DatePicker
                                    selected={selectedDates.incomeStatements}
                                    onChange={(date) => handleDateChange('incomeStatements', date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                />
                                <button className="exportButton" onClick={() => handleExport('incomeStatements')}>Export</button>
                            </div>
                            <div className="reportBox">
                                <h4>Revenue Waterfall Charts</h4>
                                <p>Visualize your revenue with waterfall charts...</p>
                                <DatePicker
                                    selected={selectedDates.waterfallCharts}
                                    onChange={(date) => handleDateChange('waterfallCharts', date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                />
                                <button className="exportButton" onClick={() => handleExport('waterfallCharts')}>Export</button>
                            </div>
                            <div className="reportBox">
                                <h4>Accounts Receivable Ageing Reports</h4>
                                <p>Access ageing reports for accounts receivable...</p>
                                <DatePicker
                                    selected={selectedDates.arAgeingReports}
                                    onChange={(date) => handleDateChange('arAgeingReports', date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                />
                                <button className="exportButton" onClick={() => handleExport('arAgeingReports')}>Export</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HostReports;
