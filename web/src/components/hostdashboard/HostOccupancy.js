import React from 'react';
import Pages from "./Pages.js";

const HostOccupancy = () => {

    return (
        <main className="container">
            <section className='host-occupancy' style={{
                display: "flex",
                flexDirection: "row"
            }}>
                <Pages />
                <div className="content">
                    <h1>Coming soon...</h1>
                </div>
            </section>
        </main>
    );
}

export default HostOccupancy;
