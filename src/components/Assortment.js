import React from "react";
import Header from "./Header";
import Accommodations from "./Accommodations";

    // //Test voor de zoekbalk
    // const SearchBar = ({ onSearch }) => {
    //     const [searchTerm, setSearchTerm] = useState('');
    
    //     const handleInputChange = (event) => {
    //       setSearchTerm(event.target.value);
    //     };
    
    //     const handleSearch = () => {
    //       onSearch(searchTerm);
    //     };
    // }

    //hier komt de accomodation overview
    const Assortment = () => {
        return ( 
            <div className="assortment">
                <div className="wrapper">
                    <div id="search-container">
                        <input 
                            type="search" 
                            id="search-input" 
                            placeholder="All" 
                        />
                        <button id="search">Search</button>
                    </div>
                    <div id="buttons">
                        <button className="button-value">testest</button>
                        <button className="button-value">estest</button>
                        <button className="button-value">sttest</button>
                    </div>
                </div>
                <div className="array"><Accommodations/></div>
            </div>
        );
    }
 
export default Assortment;