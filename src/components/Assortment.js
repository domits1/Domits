import React from "react";
import React, { useState } from 'react';
import Header from "./Header";

    //Test voor de zoekbalk
    const SearchBar = ({ onSearch }) => {
        const [searchTerm, setSearchTerm] = useState('');
    
        const handleInputChange = (event) => {
          setSearchTerm(event.target.value);
        };
    
        const handleSearch = () => {
          onSearch(searchTerm);
        };
    }

    //hier komt de accomodation overview
    const Assortment = () => {
        return ( 
            <div className="assortment">
                <Header />
                <h1>test</h1>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleInputChange}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
         );
    }
 
export default Assortment;