import React from "react";



function Dashboard() {

    return (
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
    );
}




export default Dashboard;