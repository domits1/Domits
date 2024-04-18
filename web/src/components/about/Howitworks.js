import React from "react";
import './howitworks.css'
import profile from '../../images/profile-icon.svg';

function Howitworks() {



    return (
        <main className="hiwContainer">
            <article className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Create an account with Domits</h4>
                <p className="hiwCardP">
                    Welcome to Domits! Sign up now to unlock all features, including searching, booking, and managing your perfect vacation rental. It's quick and easy – just fill out the registration form with your name, email, and chosen password. Start planning your next vacation today!</p>
                <a href="/login" className="hiwBtn">Sign up</a>
            </article>
            <article className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Find your perfect accommodation</h4>
                <p className="hiwCardP">
                Explore countless vacation rentals with Domits' user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match. Your ideal getaway is just a few clicks away!</p>
                <a href="/" className="hiwBtn">Find accommodation</a>
            </article>
            <article className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Book your next vacation!</h4>
                <p className="hiwCardP">
                    Secure your dream stay with Domits now! Choose dates, review costs, and book effortlessly. Start your unforgettable journey today!</p>
                {/* <a href="" className="hiwBtn"></a> */}
            </article>
        </main>
    )
}

export default Howitworks;