import React from 'react';
import Pages from "./Pages.js";

const HostSetup = () => {

    return (
        <main className="container">
            <section className='host-setup' style={{
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

export default HostSetup;
