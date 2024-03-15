import React from "react";
import Pages from "./Pages";
import './HostHomepage.css'

function HostListings() {

    return (
        <div className="container">
            <h2>Listings</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="box fullBox">
                            <p className="">Current listings</p>
                        </div>
                        <div className="box">
                            <p className="">Pending</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;