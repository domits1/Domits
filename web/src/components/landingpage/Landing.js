import React, { useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import styles from './landing.module.css';

import Register from "../base/Register";
import MainTextpicture from "../../images/host-landing-example.png";
import whyHostpicture from "../../images/host-landing-example2.jpg";
import verifiedLogo from "../../images/icons/verify-icon.png";
import approveLogo from "../../images/icons/approve-accept-icon.png"
import banknoteLogo from "../../images/icons/banknote-icon.png"
import supportLogo from "../../images/icons/question-mark-round-icon.png"
import internationalLogo from "../../images/icons/world-globe-line-icon.png"
import rulesLogo from "../../images/icons/result-pass-icon.png"
 
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
            
            <div className={styles.easyHosting}>
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
            </div>
            
            <div className={styles.whyHost}>
                <div className={styles.SecPicture}>
                    <img src={whyHostpicture} alt="House"/>
                </div>
                <div className={styles.whyHostText}>
                    <h1>Why should i host on <span className={styles.highlightText}>Domits</span>?</h1>
                    <p>At Domits, we're not just another platform, we're building a future-focused, 
                    sustainable community with our Travel Innovation Labs. Our innovative approach 
                    ensures that your property adds meaningful value to both travelers and the 
                    environment. You'll also enjoy unlimited support and personalized, modern 
                    dashboards that make managing your listings easier than ever. But what truly 
                    sets Domits apart is our commitment to you. You're more than just a customer or 
                    data, we genuinely care about your success, and we're here every step on the way 
                    to help you thrive. Hosting with Domits means aligning with deeply embedded 
                    values of health, safety, and sustainability, creating a future-proof path for 
                    your business.</p>
                    <button className={styles.nextButtons}></button>
                </div>
            </div>
            
            <div className={styles.simpleSafe}>
                <div className={styles.simpleSafeAll}>
                    <h1>Register your property <span className={styles.highlightText}>simple</span> and <span className={styles.highlightText}>safe</span></h1>
                    <div className={styles.SimpleSafeAllCards}>
                        <div className={styles.cardFirstHalf}>
                            <div className={styles.simpleSafeCards}>
                                <img src={verifiedLogo} alt="verified logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Certified guests</h3>
                                    <p>We verify guests' email adresses and credit cards for partners using Payments by Stripe.</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={rulesLogo} alt="houserules logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Your own house rules</h3>
                                    <p>Let your potential house guest know your house rules. The must agree to them in order to book.</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={approveLogo} alt="approve logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Choose how you want to receive your bookings</h3>
                                    <p>you can allow your guest too book directly, or you can approve a booking request before accepting them</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardSecondHalf}>
                            <div className={styles.simpleSafeCards}>
                                <img src={banknoteLogo} alt="banknote"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>receive payments regularly and securely</h3>
                                    <p>You are guaranteed to be paid and can rely on fraud protection with our payments</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={supportLogo} alt="support logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>Dedicated support</h3>
                                    <p>Our rental expert team is available to assist you with any questions or issues, ensures a smooth hassle-free experience</p>
                                </div>
                            </div>
                            <div className={styles.simpleSafeCards}>
                                <img src={internationalLogo} alt="internnational logo"></img>
                                <div className={styles.safeMiniText}>
                                    <h3>International renting</h3>
                                    <p>You rent out your holiday home on an international market. This makes the chances of renting of out your holiday home even greater</p>
                                </div>
                            </div>

                        </div>


                    </div>
                </div>
            </div>
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