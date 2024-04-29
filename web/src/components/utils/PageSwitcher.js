import React, {useEffect, useState} from "react";
import ImageSlider from "./ImageSlider";
import './PageSwitcher.css';

/**
 *
 * @param accommodations = An array of accommodations for listing
 * @param amount = The amount of accommodations you want to display per page
 * @returns {Element}
 * @constructor
 */
function PageSwitcher({accommodations, amount, onDelete}) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = amount;
    // Calculate the number of pages
    const pageCount = Math.ceil(accommodations.length / itemsPerPage);

    // Get current items
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = accommodations.slice(indexOfFirstItem, indexOfLastItem);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const getFeatures = (features) => {
        return Object.entries(features)
            .filter(([key, value]) => value === true)
            .map(([key, value]) => key);
    }
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    useEffect(() => {
        if (currentItems.length === 0 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    }, [currentItems.length, currentPage]);


    return (
        <div className="page-body">
                {currentItems.map((accommodation) => (
                    <div key={accommodation.ID} className="accommodation-tab">
                        <div className="accommodation-left">
                            <p className="accommodation-title">{accommodation.Title}</p>
                            <p className="accommodation-location">{accommodation.Country},
                                {accommodation.City},
                                {accommodation.Street},
                                {accommodation.PostalCode}
                            </p>
                            <ImageSlider images={accommodation.Images} seconds={5}/>
                        </div>

                        <div className="accommodation-right">
                            <p>Description: {accommodation.Description}</p>
                            <p>Listed on: {formatDate(accommodation.createdAt)}</p>
                            <p>Measurements: {accommodation.Measurements}m²</p>
                            <p>Features: {accommodation.Features.length > 0 ? (
                                getFeatures(accommodation.Features)) : ('none')}
                            </p>
                            <p>Rent: ${accommodation.Rent}</p>
                            {accommodation.StartDate && accommodation.EndDate ?
                                (<p>
                                    Available from
                                    {" " + formatDate(accommodation.StartDate) + " "}
                                    to {" " + formatDate(accommodation.EndDate) + " "}
                                </p>) :
                                (<p>Date range not set</p>)
                            }
                        </div>
                        <button className="listing-delete" onClick={() => onDelete(accommodation)}>Remove</button>
                    </div>
                ))}
            <div className="pagination">
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    {'<'}
                </button>
                {Array.from({length: pageCount}, (_, index) => (
                    <button key={index + 1} onClick={() => paginate(index + 1)} disabled={currentPage === index + 1}>
                        {index + 1}
                    </button>
                ))}
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === pageCount}>
                    {'>'}
                </button>
            </div>
        </div>
    );
}

export default PageSwitcher;
