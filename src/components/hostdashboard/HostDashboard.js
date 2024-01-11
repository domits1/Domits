import React from "react";
import accommodation1 from "../../components/accoimg1.png";
import accommodation2 from "../../images/accommodationtestpic2.png";
import {Link} from "react-router-dom";

function HostDashboard() {

    return (
        <div>
            <div className="sidebar">
                <ul>
                    <li><a href="#">Profile</a></li>
                    <label className="sidebar-label">Manage</label>
                    <li><a href="#">Manage</a></li>
                    <li><a href="#">Accommodations</a></li>
                    <li><a href="#">Payments</a></li>
                    <li><a href="#">Customers</a></li>
                    <li><a href="#">Settings</a></li>
                    <label className="sidebar-label">Settings</label>
                    <li><a href="#">Password</a></li>
                </ul>
            </div>
            <div className="accommodation">
                <div className="accommodation-row">
                    <div className="image-container">
                        <img src={accommodation1} alt="Accommodation Image" className="resizable-image" />
                    </div>
                    <div className="descriptions-container">
                        <h3>Kinderhuissingel 6k</h3>
                        <p>Mon - Sun / 360d p.y.</p>
                        <p>$140 - night</p>
                        <p>47 reviews</p>
                        <p>0 ad credits</p>
                    </div>
                    <div className="manage-link">
                        <Link to="/hostdashboard/read">Manage</Link>
                    </div>
                </div>
            </div>
            <div className="accommodation2">
                <div className="accommodation-row">
                    <div className="image-container">
                        <img src={accommodation2} alt="Accommodation Image" className="resizable-image" />
                    </div>
                    <div className="descriptions-container">
                        <h3>domitsstraat 190</h3>
                        <p>Mon - sat / 340d p.y.</p>
                        <p>$130 - night</p>
                        <p>41 reviews</p>
                        <p>2 ad credits</p>
                    </div>
                    <div className="manage-link">
                        <a href="#">Manage</a>
                    </div>
                </div>
            </div>
        </div>
    );
}




export default HostDashboard;