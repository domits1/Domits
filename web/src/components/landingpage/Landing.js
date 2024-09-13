import React, { useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import styles from './landing.module.css';

import Register from "../base/Register";
import rocket from "../../images/icons/rocket-02.png";
import banknote from "../../images/icons/bank-note-01.png";
import chat from "../../images/icons/message-chat-circle.png";
import monitor from "../../images/icons/monitor-01.png";
import huis from "../../images/icons/house.png";
import boothuis from "../../images/icons/house-boat.png";
import appartement from "../../images/icons/flat.png";
import camper from "../../images/icons/camper-van.png";
import villa from "../../images/icons/mansion.png";
import MainTextpicture from "../../images/host-landing-example.png";
import whyHostpicture from "../../images/host-landing-example2.jpg";


function Landing() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [group, setGroup] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        try {
            const user = await Auth.currentAuthenticatedUser();
            setIsAuthenticated(true);
            setGroup(user.attributes['custom:group']);
        } catch (error) {
            console.error('Error checking authentication:', error);
            setIsAuthenticated(false);
        }
    };

    const updateUserGroup = async () => {
        try {
            const user = await Auth.currentAuthenticatedUser();
            let result = await Auth.updateUserAttributes(user, {
                'custom:group': 'Host'
            });
            if (result === 'SUCCESS') {
                console.log("User group updated successfully");
                setGroup('Host');
                navigate('/hostdashboard');
            } else {
                console.error("Failed to update user group");
            }
        } catch (error) {
            console.error('Error updating user group:', error);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.firstSection}>
                <div className={styles.MainText}>
                    <h1>List your <span className={styles.highlightText}>House</span> for free on Domits</h1>
                    
                    <p>Hobby or profession, register your property today and start increasing your earning potential, revenue, occupancy and average daily rate.</p>

                    <button className={styles.nextButtons}></button>
                </div>
                
                <div className={styles.firstPicture}>
                    <img src={MainTextpicture} alt="House"/>
                </div>

                {/* <div className={styles.First_Icons}>
                    <div className={styles.infoCard}>
                        <img src={appartement} alt="Flat" />
                        <p>Apartment</p>
                    </div>
                    <div className={styles.infoCard}>
                        <img src={camper} alt="Camper" />
                        <p>Camper</p>
                    </div>
                    <div className={styles.infoCard}>
                        <img src={boothuis} alt="Boat" />
                        <p>Boat</p>
                    </div>
                    <div className={styles.infoCard}>
                        <img src={villa} alt="Villa" />
                        <p>Villa</p>
                    </div>
                </div> */}
            </div>
            <div className={styles.RegisterBlock}>
                {isAuthenticated && group !== 'Host' ? (
                    <div className={styles.updateGroupButtonDiv}>
                        <button onClick={updateUserGroup} className={styles.nextButtons}>
                            Become a Host
                        </button>
                    </div>
                ) : (
                    <Register />
                )}
            </div>
            
            <section className={styles.easyHosting}>
                <div className={styles.easyHosting_text}>
                    <h1>Hosting on <span className={styles.highlightText}>Domits</span> has never been <span className={styles.highlightText}>easier</span>.</h1>
                    <h3>It only takes 3 steps</h3>
                </div>
                <div className={styles.threeSteps}>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>1.</span></h1>
                        <h2>List your property</h2>
                        <p>Start earning by listing your property for free in just minutes</p>
                    </div>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>2.</span></h1>
                        <h2>Get paid</h2>
                        <p>Enjoy fast, easy and secure payments.</p>
                    </div>
                    <div className={styles.steps}>
                        <h1><span className={styles.highlightText}>3.</span></h1>
                        <h2>Receive guest</h2>
                        <p>Welcome your guest with a warm and personal touch</p>
                    </div>
                </div>


            </section>
            
            <section className={styles.whyHost}>
                <div className={styles.SecPicture}>
                    <img src={whyHostpicture} alt="House"/>
                </div>
                <div className={styles.whyHostText}>
                    <h1>Why should i host on <span className={styles.highlightText}>Domits?</span></h1>

                </div>

            </section>


{/*             
            <section className={styles.WhyHow}>
                <div className={styles.WhyHow_text}>
                    <h1>Why should i host on Domits?</h1>
                </div>
                <div className={styles.proHosting}>
                    <div className={styles.Cards}>
                        <div className={styles.infoCard}>
                            <img src={rocket} alt="Rocket Icon" />
                            <h4>vs Airbnb & Booking</h4>
                            <p>Domits creates cool new sustainable value with Travel Innovations Labs!</p>
                        </div>
                        <div className={styles.infoCard}>
                            <img src={chat} alt="Chat Icon" />
                            <h4>Customer Experience</h4>
                            <p>Unlimited support and personalized modern dashboards</p>
                        </div>
                        <div className={styles.infoCard}>
                            <img src={banknote} alt="Banknote Icon" />
                            <h4>Winning together</h4>
                            <p>You're more than just a customer or data to us. We truly care about you and your success. You'll feel it.</p>
                        </div>
                        <div className={styles.infoCard}>
                            <img src={monitor} alt="Monitor Icon" />
                            <h4>Improving 1% daily</h4>
                            <p>Healthy, safe and future-proof are deeply embedded values.</p>
                        </div>
                    </div>
                </div>
            </section> */}
            {/* <section className={styles.WhyHow}>
                <div className={styles.WhyHow_text}>
                    <h1>How to host on Domits?</h1>
                </div>
                <div className={styles.proHosting}>
                    <div className={styles.Cards}>
                        <div className={styles.infoCard}>
                            <img src={rocket} alt="Rocket Icon" />
                            <h4>List your property</h4>
                            <p>List your property free of charge within minutes</p>
                        </div>
                        <div className={styles.infoCard}>
                            <img src={banknote} alt="Banknote Icon" />
                            <h4>Get paid</h4>
                            <p>Easy, fast and safe payments</p>
                        </div>
                        <div className={styles.infoCard}>
                            <img src={chat} alt="Chat Icon" />
                            <h4>Receive guests</h4>
                            <p>Give guests a warmhearted welcome</p>
                        </div>
                    </div>
                </div>
            </section> */}
        </div>
    );
}

export default Landing;