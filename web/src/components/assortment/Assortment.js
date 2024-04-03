import React, { useState } from "react";
import Accommodations from "../hostdashboard/Accommodations";
import Header from "../base/Header";
import Modal from "react-modal";
import Login from "../base/Login";
import searchIcon from '../../images/icons/search-lg.svg';
import sortIcon from '../../images/icons/filter-lines.svg';
import './assortment.css';
import CheckoutFrontend from '../checkout/CheckoutFrontEnd'

const Assortment = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterQuery, setFilterQuery] = useState("");

    // new implementation. adda the search and filter after the layout is finished
    // Define options for each dropdown
    const visitorGuestsOptions = [
        { value: '2 adults - 5 kids', label: '2 adults - 5 kids' },
        { value: 'OptionB', label: 'OptionB' },
    ];

    const dateRangeOptions = [
        { value: '3 february - 7 february', label: '3 february - 7 february' },
        { value: 'optionB', label: 'Option B' },
    ];

    const priceRangeOptions = [
        { value: 'min $250 - max $1500', label: 'min $250 - max $1500' },
        { value: 'optionY', label: 'Option Y' },
    ];

    const tagsOptions = [
        { value: 'Spacious, Historical', label: 'Spacious, Historical' },
        { value: 'tag2', label: 'Tag 2' },
    ];

    const [visitorGuests, setVisitorGuests] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [priceRange, setPriceRange] = useState('');
    const [tags, setTags] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('');

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleFilter = (query) => {
        setFilterQuery(query);
    };

    const handleSortButtonClick = (order) => {
        // Placeholder function for sorting, replace with your actual sorting logic
        console.log(`Sorting order: ${order}`);
    };

    return (
        <div>
            <div className="assortment">
                {/* { <CheckoutFrontend/> }                 */}
                    <Accommodations searchQuery={searchQuery} filterQuery={filterQuery} />
                
            </div>
        </div>
    );
};

const Dropdown = ({ value, onChange, options }) => {
    return (
        <div className="dropdown">
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default Assortment;


// <div className="assortment">
{/*<div id="search-container">*/ }
{/*    <input*/ }
{/*        type="search"*/ }
{/*        id="search-input"*/ }
{/*        placeholder="Search..."*/ }
{/*        value={searchQuery}*/ }
{/*        onChange={(e) => handleSearch(e.target.value)}*/ }
{/*    />*/ }
{/*</div>*/ }
{/*<div id="filter-container">*/ }
{/*    <input*/ }
{/*        type="text"*/ }
{/*        id="filter-input"*/ }
{/*        placeholder="Filter"*/ }
{/*        value={filterQuery}*/ }
{/*        onChange={(e) => handleFilter(e.target.value)}*/ }
{/*    />*/ }
{/*</div>*/ }

// </div>