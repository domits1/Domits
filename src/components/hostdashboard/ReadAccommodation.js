import React from "react";
// import accommodation1 from "../../images/accommodationtestpic1.png";
import accommodation1 from "../../images/accoimg1.png"
import {Link} from "react-router-dom";

function ReadAccommodation() {
    return (
        <div>
            <div className="white-block-container">
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
                        <ul>
                            <li><Link to="/hostdashboard/read">Change name</Link></li>
                            <li><Link to="placeholder">Change availability</Link></li>
                            <li><Link to="placeholder">Change price per night</Link></li>
                            <li><Link to="placeholder">View reviews</Link></li>
                            <li><Link to="placeholder">Buy advertisement credits</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
            </div>
            <div className="white-block-container">
            <div className="manage-link">
                <Link to="placeholder">Change gallery</Link>
            </div>
            </div>
            <div className="white-block-container">
            <div className="white-block"></div>
            <div className="white-block"></div>
            <div className="white-block"></div>
            </div>
        </div>
    );
}

export default ReadAccommodation;