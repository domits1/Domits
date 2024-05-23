import React from "react";
import Page from "./Calculator";
import FAQ from "./Faq";
import './landing.css';
import Register from "../base/Register"
import rocket from "../../images/icons/rocket-02.png";
import banknote from "../../images/icons/bank-note-01.png";
import chat from "../../images/icons/message-chat-circle.png";
import monitor from "../../images/icons/monitor-01.png";

function Landing() {


    return (
        <div className="container">
            <div className="MainText">
                <h1>Host on Domits, the All-In-1 Travel App</h1>
                <p className="">Increase your earning potential, revenue, occupancy & average daily rate </p>
            </div>
            <div className="RegisterBlock">
                <Register/>
            </div>
            <section className="Why-How">
            <h1>Why host on Domits?</h1>
            <div className="proHosting">
                <div className="Cards">
                    <div class='infoCard'>
                        <img src={rocket}></img>
                        <h4>Fast onboarding</h4>
                        <p>You are just 3 steps away from listing your property with us!</p>
                    </div>
                    <div class='infoCard'>
                        <img src={banknote}></img>
                        <h4>20+ payment methods</h4>
                        <p>Mastercard, PayPal, Stripe, Cryptocurrency and more.</p>
                    </div>
                    <div class='infoCard'>
                        <img src={chat}></img>
                        <h4>Domits Message centre</h4>
                        <p>Message centre including chat moderator support to make communicating with a traveller easy and safe!</p>
                    </div>
                    <div class='infoCard'>
                        <img src={monitor}></img>
                        <h4>Personal Dashboard</h4>
                        <p>Modern, quick and customizable dashboard with over 10 widgets.</p>
                    </div>

                </div>
                {/* <div>
                    <FAQ />
                </div> */}
            </div>
            </section>
            <div className="calculatorBlock">
                <Page />
            </div>

        </div>
    );
}

export default Landing;
