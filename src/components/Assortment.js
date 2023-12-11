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
            <div className="search-filters">
                <div>
                    <label htmlFor="search">Search accomodation</label>
                    <input type="search" placeholder="Search..." id="search"/>
                    <button >Search</button>
                </div>
                <div className="array">
                    <Accommodations />
                </div>
            </div>
         );
    }
 
export default Assortment;