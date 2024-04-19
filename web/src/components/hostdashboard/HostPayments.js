import React from "react";
import Pages from "./Pages";
import './HostHomepage.css'

function HostPayments() {

    return (
        <main className="container">
            <h2>Payments</h2>
            <section className="dashboard">
                <Pages />

                <section className="contentContainer">
                    <section className="boxColumns fullColumn">
                        <article className="box fullBox">
                            <p>No payments yet, they will appear here once data is available.</p>  {/* original text: Ready to be withdrawn  */}
                            {/* <div className="withdrawContain">
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
                            </div> */}
                        </article>
                        {/* <button id="withdrawButton">Withdraw</button> */}
                        {/* <div className="box fullBox">
                            <p>Completed payments</p>
                        </div>
                        <div className="box fullBox">
                            <p>Cancelled payments</p>
                        </div> */}
                    </section>

                </section>
            </section>
        </main>
    );
}




export default HostPayments;