import React from "react";
import Pages from "./Pages";
import './HostHomepage.css'

function HostPayments() {

    return (
        <div className="container">
            <h2>Payments</h2>
            <div className="dashboard">
                <Pages />

                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="box fullBox">
                            <p>Ready to be withdrawn</p>
                            <div className="withdrawContain">
                                <p className="priceText">$6000</p>
                                <p className="withdrawText">Ready for payout</p>
                            </div>
                            <div className="withdrawContain">
                                <p className="priceText">$700000</p>
                                <p className="withdrawText">Ready for payout</p>
                            </div>
                            <div className="withdrawContain">
                                <p className="priceText">$12300</p>
                                <p className="withdrawText">Pending withdrawal</p>
                            </div>
                            <div className="withdrawContain">
                                <p className="priceText">$5000</p>
                                <p className="withdrawText">Ready for payout</p>
                            </div>
                            <div className="withdrawContain">
                                <p className="priceText">$1250</p>
                                <p className="withdrawText">Ready for payout</p>
                            </div>
                        </div>
                        <button id="withdrawButton">Withdraw</button>
                        <div className="box fullBox">
                            <p>Completed payments</p>
                        </div>
                        <div className="box fullBox">
                            <p>Cancelled payments</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}




export default HostPayments;