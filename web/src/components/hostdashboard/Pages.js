import React from "react";

const Dashboard = () => 
<div className="contentContainer">
                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Current guests</p>
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
;
const Messages = () => <div>Messages Page Content</div>;
const Payments = () => <div>Payments Page Content</div>;
const Listing = () => <div>Listing Page Content</div>;
const Calendar = () => <div>Calendar Page Content</div>;
const Settings = () => <div>Settings Page Content</div>;

export { Dashboard, Messages, Payments, Listing, Calendar, Settings };