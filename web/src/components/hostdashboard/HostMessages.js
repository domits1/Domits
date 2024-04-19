import React from "react";
import Pages from "./Pages";
import './HostHomepage.css'

function HostMessages() {

    return (
        <main className="container">
            <h2>Dashboard</h2>
            <article className="dashboard">
                <Pages />
                <article className="contentContainer">
                    <div></div>
                </article>
            </article>
        </main>
    );
}




export default HostMessages;