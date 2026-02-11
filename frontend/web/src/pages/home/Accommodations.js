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
        const targetCount = (currentPage + 1) * itemsPerPage; 

        if (accolist.length >= targetCount) {
            setCurrentPage(prev => prev + 1);
            return;
        }

        setPaginationLoading(true);

        let currentTotal = accolist.length;
        let tempKeyId = lastEvaluatedKeyId;
        let tempKeyCreatedAt = lastEvaluatedKeyCreatedAt;
        let incomingItems = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        try {
            while (currentTotal < targetCount && tempKeyId && attempts < MAX_ATTEMPTS) {
                attempts++;
                const result = await FetchAllPropertyTypes(tempKeyCreatedAt, tempKeyId);
                
                if (result.properties && result.properties.length > 0) {
                    incomingItems = [...incomingItems, ...result.properties];
                    currentTotal += result.properties.length;
                }

                if (result.lastEvaluatedKey) {
                    tempKeyCreatedAt = result.lastEvaluatedKey.createdAt;
                    tempKeyId = result.lastEvaluatedKey.id;
                } else {
                    tempKeyCreatedAt = null;
                    tempKeyId = null;
                }
            }

        } catch (error) {
            console.error("Błąd podczas pętli pobierania:", error);
        } finally {
            setLastEvaluatedKeyCreatedAt(tempKeyCreatedAt);
            setLastEvaluatedKeyId(tempKeyId);

            if (incomingItems.length > 0) {
                setAccolist(prev => [...prev, ...incomingItems]);
                setCurrentPage(prev => prev + 1);
            } 
            else {
                console.log("Sprawdziliśmy, ale nie ma więcej domków. Zostajemy na tej stronie.");
                if (!incomingItems.length && !tempKeyId) {
                    setLastEvaluatedKeyId(null);
                }
            }
            
            setPaginationLoading(false);
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

    const handleClick = (e, ID) => {
        if (!e || !e.target) return;
        if (e.target.closest('.swiper-button-next') || e.target.closest('.swiper-button-prev')) {
            e.stopPropagation();
            return;
        }
        navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
    };

    if (filterLoading || searchLoading) {
        return (
            <div id="container">
                <style>{`
                    #card-visibility {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 20px;
                        width: 100%;
                        align-items: start;
                    }
                    @media (max-width: 1200px) { #card-visibility { grid-template-columns: repeat(3, 1fr); } }
                    @media (max-width: 900px) { #card-visibility { grid-template-columns: repeat(2, 1fr); } }
                    @media (max-width: 600px) { #card-visibility { grid-template-columns: 1fr; } }
                `}</style>
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

    return (
        <>
            <style>{`
                #card-visibility {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    width: 100%;
                    align-items: start;
                    margin-top: 20px;
                }
                /* Responsywność */
                @media (max-width: 1200px) { #card-visibility { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 900px) { #card-visibility { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 600px) { #card-visibility { grid-template-columns: 1fr; } }
            `}</style>

            <div id="container">
                <div id="filters-sidebar">
                    <FilterUi onFilterApplied={handleFilterApplied} />
                </div>
                <div id="card-visibility">
                    {paginationLoading ? (
                        Array(4).fill().map((_, index) => <SkeletonLoader key={index} />)
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