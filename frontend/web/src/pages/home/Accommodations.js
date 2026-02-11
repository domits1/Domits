import React, { useState, useEffect } from "react";
import PageSwitcher from '../../utils/PageSwitcher.module.css';
import SkeletonLoader from '../../components/base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import AccommodationCard from "./AccommodationCard";
import FilterUi from "./FilterUi";
import { FetchAllPropertyTypes } from "./services/fetchProperties";

const Accommodations = ({ searchResults }) => {
    const [accolist, setAccolist] = useState([]);

    const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] = useState(null);
    const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);

    const [filterLoading, setFilterLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [paginationLoading, setPaginationLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    
    const itemsPerPage = 12; 
    
    const navigate = useNavigate();

    const totalLoadedPages = Math.ceil(accolist.length / itemsPerPage);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const displayedAccolist = accolist.slice(startIndex, endIndex);

    const handlePageNumberClick = (page) => {
        if (page >= 1 && page <= totalLoadedPages) {
            setCurrentPage(page);
        }
    };

    const handleNextPage = async () => {
        const nextPageIndex = currentPage * itemsPerPage; 
        
        if (accolist.length > nextPageIndex) {
            setCurrentPage(prev => prev + 1);
            return;
        }

        if (lastEvaluatedKeyId) {
            setPaginationLoading(true);
            
            try {
                const result = await FetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId);
                
                if (result.lastEvaluatedKey) {
                    setLastEvaluatedKeyCreatedAt(result.lastEvaluatedKey.createdAt);
                    setLastEvaluatedKeyId(result.lastEvaluatedKey.id);
                } else {
                    setLastEvaluatedKeyCreatedAt(null);
                    setLastEvaluatedKeyId(null);
                }

                if (result.properties.length > 0) {
                    setAccolist(prev => [...prev, ...result.properties]);
                    setCurrentPage(prev => prev + 1);
                }
            } catch (error) {
                console.error("Error fetching next page:", error);
            } finally {
                setPaginationLoading(false);
            }
        }
    };

    const handleFilterApplied = (filteredResults) => {
        setFilterLoading(true);
        setTimeout(() => {
            setAccolist(filteredResults);
            setCurrentPage(1);
            setLastEvaluatedKeyCreatedAt(null);
            setLastEvaluatedKeyId(null);
            setFilterLoading(false);
        }, 500);
    };

    useEffect(() => {
        async function loadData() {
            setSearchLoading(true);
            if (searchResults && searchResults.length > 0) {
                setTimeout(() => {
                    setAccolist(searchResults);
                    setCurrentPage(1);
                    setSearchLoading(false);
                }, 500);
            } else {
                const result = await FetchAllPropertyTypes(null, null);
                
                if (result.lastEvaluatedKey) {
                    setLastEvaluatedKeyCreatedAt(result.lastEvaluatedKey.createdAt);
                    setLastEvaluatedKeyId(result.lastEvaluatedKey.id);
                } else {
                    setLastEvaluatedKeyCreatedAt(null);
                    setLastEvaluatedKeyId(null);
                }
                setAccolist(result.properties);
                setSearchLoading(false);
            }
        }
        loadData();
    }, [searchResults]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [currentPage]);

    if (filterLoading || searchLoading) {
        return (
            <div id="container">
                <div id="filters-sidebar">
                    <FilterUi onFilterApplied={handleFilterApplied} />
                </div>
                <div id="card-visibility">
                    {Array(12).fill().map((_, index) => (
                        <SkeletonLoader key={index} />
                    ))}
                </div>
            </div>
        );
    }

    const handleClick = (e, ID) => {
        if (!e || !e.target) return;
        if (e.target.closest('.swiper-button-next') || e.target.closest('.swiper-button-prev')) {
            e.stopPropagation();
            return;
        }
        navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
    };

    return (
        <>
            <div id="container">
                <div id="filters-sidebar">
                    <FilterUi onFilterApplied={handleFilterApplied} />
                </div>
                <div id="card-visibility">
                    {paginationLoading ? (
                         <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                            {Array(4).fill().map((_, index) => <SkeletonLoader key={index} />)}
                         </div>
                    ) : (
                        displayedAccolist.length > 0 ? (
                            displayedAccolist.map((accommodation) => (
                                <AccommodationCard
                                    key={accommodation.ID}
                                    accommodation={accommodation}
                                    onClick={handleClick}
                                />
                            ))
                        ) : (
                            <div>No accommodations found.</div>
                        )
                    )}
                </div>
            </div>
            
            <div className={PageSwitcher.pagination}>
                <button
                    onClick={() => handlePageNumberClick(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    &lt; Previous
                </button>
                
                {Array.from({ length: totalLoadedPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => handlePageNumberClick(i + 1)}
                        className={`${currentPage === i + 1 ? PageSwitcher.active : ''}`}
                    >
                        {i + 1}
                    </button>
                ))}

                <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalLoadedPages && !lastEvaluatedKeyId}
                >
                    Next &gt;
                </button>
            </div>
        </>
    );
};

export default Accommodations;