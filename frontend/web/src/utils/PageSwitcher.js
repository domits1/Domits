import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from './PageSwitcher.module.css';
import DateFormatterDD_MM_YYYY from "./DateFormatterDD_MM_YYYY";
import {
  placeholderImage,
  resolvePrimaryAccommodationImageUrl,
} from "./accommodationImage";

function PageSwitcher({ accommodations, bankDetailsProvided, amount, onEdit, onDelete, onUpdate }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = amount;
  const pageCount = Math.ceil(accommodations.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = accommodations.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getFeatures = (features = {}) =>
    Object.entries(features)
      .filter(([, value]) => value === true)
      .map(([key]) => key);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (currentItems.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentItems.length, currentPage]);

  return (
    <main className="page-body">
      {currentItems.map((accommodation) => {
        const createdAtTimestamp = new Date(accommodation.createdAt).getTime();
        const updatedAtTimestamp = new Date(accommodation.updatedAt).getTime();
        const listedOnDate = !Number.isNaN(createdAtTimestamp)
          ? formatDate(accommodation.createdAt)
          : formatDate(accommodation.updatedAt);
        const lastChangeDate = !Number.isNaN(updatedAtTimestamp)
          ? formatDate(accommodation.updatedAt)
          : formatDate(accommodation.createdAt);
        const canSetLive = bankDetailsProvided && accommodation.DateRanges?.length > 0;

        return (
          <section key={accommodation.property.id} className={styles.accommodationTab}>
            <section className={styles.accommodationLeft}>
              <p className={styles.accommodationTitle}>{accommodation.property.title}</p>
              <p className={styles.accommodationLocation}>
                {accommodation.property.country},{accommodation.property.city}
              </p>
              {accommodation.images?.length > 0 ? (
                <img
                  src={resolvePrimaryAccommodationImageUrl(accommodation.images, "thumb")}
                  alt="Geen afbeelding beschikbaar"
                  className="img-listed-dashboard"
                />
              ) : (
                <img src={placeholderImage} alt="Geen afbeelding beschikbaar" />
              )}
            </section>

            <section className={styles.accommodationRight}>
              <p>Subtitle: {accommodation.property.subtitle}</p>
              <p>Listed on: {listedOnDate}</p>
              <p>Last change: {lastChangeDate}</p>
              <p>Features: {accommodation.Features.length > 0 ? getFeatures(accommodation.Features) : 'none'}</p>
              <p>Rent: ${accommodation.Rent}</p>
              {accommodation.DateRanges && accommodation.DateRanges.length > 0 ? (
                <p>
                  Available from {DateFormatterDD_MM_YYYY(accommodation.DateRanges[0].startDate)} to{' '}
                  {DateFormatterDD_MM_YYYY(accommodation.DateRanges[accommodation.DateRanges.length - 1].endDate)}
                </p>
              ) : (
                <p>Date range not set</p>
              )}
            </section>
            <div className={styles.listingButtonBox}>
              <button
                className={`${styles.listingButton} ${styles.listingEdit}`}
                onClick={() => onEdit(accommodation.ID, accommodation.Title)}
              >
                Edit
              </button>
              <button
                className={`${styles.listingButton} ${styles.listingDelete}`}
                onClick={() => onDelete(accommodation)}
              >
                Remove
              </button>
              {accommodation.Drafted === true ? (
                <button
                  className={styles.listingButton}
                  onClick={() => onUpdate(accommodation.ID, false)}
                  disabled={!canSetLive}
                  style={{ backgroundColor: canSetLive ? '#003366' : 'gray', fontSize: '0.8rem' }}
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
        );
      })}
      <div className={styles.pagination}>
        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
          {'<'}
        </button>
        {Array.from({ length: pageCount }, (_, index) => (
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

PageSwitcher.propTypes = {
  accommodations: PropTypes.arrayOf(
    PropTypes.shape({
      ID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Title: PropTypes.string,
      Drafted: PropTypes.bool,
      Rent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      images: PropTypes.array,
      Features: PropTypes.object,
      DateRanges: PropTypes.arrayOf(
        PropTypes.shape({
          startDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        })
      ),
      property: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string,
        subtitle: PropTypes.string,
        country: PropTypes.string,
        city: PropTypes.string,
      }).isRequired,
    })
  ).isRequired,
  bankDetailsProvided: PropTypes.bool.isRequired,
  amount: PropTypes.number.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default PageSwitcher;
