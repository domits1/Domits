import React from "react";
import Pages from "./Pages";
import './HostHomepage.scss'

function HostMessages() {

    return (
        <div className="container">
            <h2>Dashboard</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div></div>
                </div>
            </div>
        </div>
    );
}




export default HostMessages;