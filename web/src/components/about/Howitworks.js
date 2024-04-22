import React from "react";
import './howitworks.css'
import profile from '../../images/profile-icon.svg';

function Howitworks() {



    return (
        <div className="container">
        <div className="hiwContainerTraveller">
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Create an account with Domits</h4>
                <p className="hiwCardP">
                    Welcome to Domits! Sign up now to unlock all features, including searching, booking, and managing your perfect vacation rental. It's quick and easy – just fill out the registration form with your name, email, and chosen password. Start planning your next vacation today!</p>
                <a href="/login" className="hiwBtn">Sign up</a>
            </div>
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Find your perfect accommodation</h4>
                <p className="hiwCardP">
                Explore countless vacation rentals with Domits' user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match. Your ideal getaway is just a few clicks away!</p>
                <a href="/" className="hiwBtn">Find accommodation</a>
            </div>
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImg" />
                <h4 className="hiwCardHeading">Book your next vacation!</h4>
                <p className="hiwCardP">
                    Secure your dream stay with Domits now! Choose dates, review costs, and book effortlessly. Start your unforgettable journey today!</p>
                {/* <a href="" className="hiwBtn"></a> */}
            </div>
            </div>
            <div className="hiwContainerHost">
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImgHost" />
                <h4 className="hiwCardHeading">Create an account with Domits</h4>
                <p className="hiwCardP">
                    Welcome to Domits! Sign up now to unlock all features, including searching, booking, and managing your perfect vacation rental. It's quick and easy – just fill out the registration form with your name, email, and chosen password. Start planning your next vacation today!</p>
                <a href="/login" className="hiwBtnHost">Sign up</a>
            </div>
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImgHost" />
                <h4 className="hiwCardHeading">Find your perfect accommodation</h4>
                <p className="hiwCardP">
                Explore countless vacation rentals with Domits' user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match. Your ideal getaway is just a few clicks away!</p>
                <a href="/" className="hiwBtnHost">Find accommodation</a>
            </div>
            <div className="hiwCard">
                <img src={profile} alt="" className="hiwCardImgHost" />
                <h4 className="hiwCardHeading">Book your next vacation!</h4>
                <p className="hiwCardP">
                    Secure your dream stay with Domits now! Choose dates, review costs, and book effortlessly. Start your unforgettable journey today!</p>
                {/* <a href="" className="hiwBtnHost"></a> */}
            </div>
        </div>
        </div>
    )
}

export default Howitworks;