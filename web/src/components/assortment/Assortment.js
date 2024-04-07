import React from "react";
import Accommodations from "../hostdashboard/Accommodations";
import './assortment.css';

function Assortment({ searchResults }) {
    console.log('Assortment received searchResults:', searchResults);
    return (
        <div>
            <div className="assortment">
                <Accommodations searchResults={searchResults} />
            </div>
        </div>
    );
};

export default Assortment;