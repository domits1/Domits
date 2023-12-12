import logo from "../../logo.svg";
import React from "react";
import {Link} from "react-router-dom";

const Navbar = () => {
    return (
        <nav className="navbar">
            <Link to="/admin">
                <img className="img" src={logo} alt="logo.png" height={50} />
            </Link>
            <div className="nav">
                Tim Hart :cape:<br/>
                <b>Superadmin</b>
            </div>
        </nav>
    );
}

export default Navbar;