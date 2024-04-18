import React from "react";
import Accommodations from "../hostdashboard/Accommodations";
import './assortment.css';

function Assortment({ searchResults, loading }) {
    // console.log('Assortment received searchResults:', searchResults);
    return (
        <main>
            <section className="assortment">
            <Accommodations searchResults={searchResults} loading={loading} />
            </section>
        </main>
    );
};

export default Assortment;