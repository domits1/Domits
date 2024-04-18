import React from "react";
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import './AdminDashboard.css';


function HomeDashboard() {
    return (
        <main className="grid-container">
            <section className="header">
                <Navbar />
            </section>
            <section className="menu">
                <Sidebar />
            </section>
            <section className="main">
                Hier komt de uiteindelijke code
            </section>
        </main>
    );
}

export default HomeDashboard;