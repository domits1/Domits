import React from 'react';
import Pages from "./Pages.js";

const HostPricing = () => {

    return (
        <main className="container">
            <section className='host-pricing' style={{
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

export default HostPricing;
