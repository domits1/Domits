import React from "react";
import"./errorpage.css";
import { Link } from "react-router-dom";

function errorpage () {
    return(
        <div className="errorpage">
            <h1>ERROR 404</h1>
            <h2>Oh no... you are lost</h2>
            <h3>This page does not exist or is offline for maintenance. We do have a couple of suggestions for you to go to:</h3>
            <div>
                <Link to="/home">
                    <button>Find accommodation</button>
                </Link>
                <Link to="/home">
                    <button>Account</button>
                </Link>
                <Link to="/home">
                    <button>Message center</button>
                </Link>
                <Link to="/contact">
                    <button>Contact</button>
                </Link>
            </div>
        </div>

    );
}

export default errorpage;