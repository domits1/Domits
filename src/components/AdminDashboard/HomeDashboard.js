import React from "react";
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import './AdminDashboard.css';


function HomeDashboard() {
    return (
        <div className="grid-container">
            <div className="header">
                <Navbar />
            </div>
            <div className="menu">
                <Sidebar />
            </div>
            <div className="main">
                Test
            </div>
        </div>
    );
}

export default HomeDashboard;