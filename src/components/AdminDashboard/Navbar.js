import logo from "../../logo.svg";
import React from "react";

const Navbar = () => {
    return (
        <nav className="navbar">
            <img className="img" src={logo} alt="logo.png" height={50}/>
            <div className="nav">
                Stefan Hopman:<br/>
                <b>Superadmin</b>
            </div>
        </nav>
    );
}

export default Navbar;