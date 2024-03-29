import React from "react";
import Pages from "./Pages.js";
import './HostHomepage.css';

function HostDashboard() {

    return (
        <div className="container">
            <h2>Dashboard</h2>
            <div className="dashboard">
                <Pages />

                <div className="contentContainer">
                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Dashboard</p>
                        </div>
                        <div className="box">
                            <p className="boxText">Pending guests</p>
                        </div>
                    </div>

                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Earnings</p>
                        </div>
                    </div>

                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Disputes</p>
                        </div>
                        <div className="box">
                            <p className="boxText">Recent reviews</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}




export default HostDashboard;