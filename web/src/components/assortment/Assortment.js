import React from "react";
import Accommodations from "../hostdashboard/Accommodations";
import './assortment.css';

function Assortment({ searchResults, loading }) {
    // console.log('Assortment received searchResults:', searchResults);
    return (
        <div>
            <div className="assortment">
            <Accommodations searchResults={searchResults} loading={loading} />
            </div>
        </div>
    );
};

export default Assortment;