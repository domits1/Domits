import React from "react";
import Pages from "./Pages";
import './HostHomepage.css'
import add from "../../images/icons/host-add.png";
import { useNavigate } from 'react-router-dom';

function HostListings() {

    const navigate = useNavigate();

    return (
        <div className="container">
            <h2>Listings</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="wijzer addAcco" onClick={() => navigate("/enlist")} style={{maxWidth: 250,}}>
                            <img src={add} alt="add"></img>
                            <p>Add new accommodation</p>
                        </div>
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