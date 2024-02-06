import React, { useState } from 'react';

function SearchBar() {
    return (
        <div className="search-bar">
            <div className="inner-search-bar">
                {/* Your input field goes here */}
                <input type="text" placeholder="Search..." />

                {/* Search icon */}
                <div className="search-icon">
                    {/*<img src={searchIcon} width={20} alt="Search Icon" />*/}
                </div>
            </div>
        </div>
    );
}

export default SearchBar;
