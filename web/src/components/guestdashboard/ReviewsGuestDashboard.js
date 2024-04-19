import React from "react";
import Pages from "./Pages.js";
import './guestdashboard.css';

function GuestReviews() {

    return (
        <main className="container">
            <h2>Reviews</h2>
            <section className="dashboards">
                <Pages />

                <article className="contentContainer">
                    <article className="reviewColumn">
                        <article className="reviewBox">
                            <p className="reviewText">Earnings</p>
                        </article>
                    </article>

                    <article className="reviewColumn">
                        <article className="reviewBox">
                            <p className="reviewText">Disputes</p>
                        </article>
                        <article className="reviewBox">
                            <p className="reviewText">Recent reviews</p>
                        </article>
                    </article>
                </article>
            </section>
        </main>
    );
}




export default GuestReviews;