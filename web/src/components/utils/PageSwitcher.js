import React, {useEffect, useState} from "react";
import ImageSlider from "./ImageSlider";
import styles from './PageSwitcher.module.css';
import DateFormatterDD_MM_YYYY from "./DateFormatterDD_MM_YYYY";
function PageSwitcher({accommodations, bankDetailsProvided, amount, onEdit, onDelete , onUpdate}) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = amount;
    const pageCount = Math.ceil(accommodations.length / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = accommodations.slice(indexOfFirstItem, indexOfLastItem);

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
        <main className="page-body">
                {currentItems.map((accommodation) => (
                    <section key={accommodation.ID} className={styles.accommodationTab}>
                        <section className={styles.accommodationLeft}>
                            <p className={styles.accommodationTitle}>{accommodation.Title}</p>
                            {accommodation.AccommodationType === 'Boat' ? (
                                <p className={styles.accommodationLocation}>{accommodation.Country},
                                    {accommodation.City},
                                    {accommodation.Harbour}
                                </p>
                            ) : (
                                <p className={styles.accommodationLocation}>{accommodation.Country},
                                    {accommodation.City},
                                    {accommodation.Street},
                                    {accommodation.PostalCode}
                                </p>
                            )}
                            <ImageSlider images={accommodation.Images} seconds={5} page={'listing'}/>
                        </section>

                        <section className={styles.accommodationRight}>
                            <p>Subtitle: {accommodation.Subtitle}</p>
                            <p>Listed on: {" "}
                                {isNaN(new Date(accommodation.createdAt).getTime())
                                    ? formatDate(accommodation.updatedAt)
                                    : formatDate(accommodation.createdAt)}</p>
                            <p>Last change:{" "}
                                {isNaN(new Date(accommodation.updatedAt).getTime())
                                    ? formatDate(accommodation.createdAt)
                                    : formatDate(accommodation.updatedAt)}</p>
                            <p>Features: {accommodation.Features.length > 0 ? (
                                getFeatures(accommodation.Features)) : ('none')}
                            </p>
                            <p>Rent: ${accommodation.Rent}</p>
                            {accommodation.DateRanges.length > 0 ?
                                (<p>
                                    Available from
                                    {" " + DateFormatterDD_MM_YYYY(accommodation.DateRanges[0].startDate) + " "}
                                    to {" " +
                                    DateFormatterDD_MM_YYYY(accommodation.DateRanges[accommodation.DateRanges.length - 1].endDate) + " "}
                                </p>) :
                                (<p>Date range not set</p>)
                            }
                        </section>
                        <div className={styles.listingButtonBox}>
                            <button className={`${styles.listingButton} ${styles.listingEdit}`}
                                    onClick={() => onEdit(accommodation.ID, accommodation.Title)}>Edit
                            </button>
                            <button className={`${styles.listingButton} ${styles.listingDelete}`}
                                    onClick={() => onDelete(accommodation)}>Remove
                            </button>
                            {accommodation.Drafted === true ? (
                                <button
                                    className={styles.listingButton}
                                    onClick={() => onUpdate(accommodation.ID, false)}
                                    disabled={!(bankDetailsProvided && accommodation.DateRanges.length > 0)}
                                    style={{ backgroundColor: !(bankDetailsProvided && accommodation.DateRanges.length > 0) ? 'gray' : '#003366', fontSize: '0.8rem' }}
                                >
                                    Set Live
                                </button>
                            ) : (
                                <button
                                    className={`${styles.listingButton} ${styles.listingDraft}`}
                                    onClick={() => onUpdate(accommodation.ID, true)}
                                    style={{ backgroundColor: '#003366', fontSize: '0.75rem' }}
                                >
                                    Set Draft
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            <div className={styles.pagination}>
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
        </main>
    );
}

export default PageSwitcher;
