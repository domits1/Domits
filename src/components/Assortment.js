import React, { useState } from "react";
import Accommodations from "./Accommodations";

const Assortment = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterQuery, setFilterQuery] = useState("");

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleFilter = (query) => {
        setFilterQuery(query);
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
            <div id="filter-container">
                <input
                    type="text"
                    id="filter-input"
                    placeholder="Filter"
                    value={filterQuery}
                    onChange={(e) => handleFilter(e.target.value)}
                />
            </div>
            <div className="array">
                <Accommodations searchQuery={searchQuery} filterQuery={filterQuery} />
            </div>
        </div>
    );
};

export default Assortment;
