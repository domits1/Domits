import React from "react";
import Page from "./Calculator"; 
import './landing.css';

import huis from "../../images/huis-illustratie.png";

function Landing() {
    
      
    return (
        <div className="container">
            <h1>Over 4.000+ people are hosting in Domits</h1>
            <p className="">What does it look like to host on Domits? We'll show you!</p>
            <div className="calculatorBlock">
                <Page />
            </div>
            <div className="prohosting">
                <div className="cardHolder">
                    <div class='infoCard'>
                        <img src={huis}></img>
                        <h4>Fast onboarding</h4>
                        <p>You are just 3 steps away from listing your property with us!</p>    
                    </div>
                    <div class='infoCard'>
                        <img src={huis}></img>
                        <h4>20+ payment methods</h4>
                        <p>Mastercard, PayPal, Stripe, Cryptocurrency and more.</p>    
                    </div>
                    <div class='infoCard'>
                        <img src={huis}></img>
                        <h4>Domits Message centre</h4>
                        <p>Message centre including chat moderator support to make communicating with guests easy and safe!</p>    
                    </div>
                    <div class='infoCard'>
                        <img src={huis}></img>
                        <h4>Personal Dashboard</h4>
                        <p>Modern, quick and customizable dashboard with over 10 widgets.</p>    
                    </div>
                    
                </div>
            </div>
        </div>
    );
}

export default Landing;
