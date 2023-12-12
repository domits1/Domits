import React, { useState } from "react";
import Header from "./Header";
import Accommodations from "./Accommodations";

const Assortment = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    return ( 
        <div className="assortment">
            <div id="search-container">
                <input 
                    type="search" 
                    id="search-input" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            <div className="array">
                <Accommodations searchQuery={searchQuery} />
            </div>
        </div>
    );
}
 
export default Assortment;
