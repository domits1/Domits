import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import PageSwitcher from "../../utils/PageSwitcher.module.css";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import { useNavigate } from "react-router-dom";
import AccommodationCard from "./AccommodationCard";
import FilterUi from "./FilterUi";
import { FetchAllPropertyTypes } from "./services/fetchProperties";

const SKELETON_IDS = ["sk-0","sk-1","sk-2","sk-3","sk-4","sk-5","sk-6","sk-7","sk-8","sk-9","sk-10","sk-11"];

const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const nearby = new Set(
    [1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total)
  );
  const sorted = [...nearby].sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(`ellipsis-before-${sorted[i]}`);
    }
    result.push(sorted[i]);
  }
  return result;
};

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);

  const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] = useState(null);
  const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreInFlightRef = useRef(false);

  const [filterLoading, setFilterLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const totalPages = Math.ceil(accolist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const hasMore = lastEvaluatedKeyCreatedAt !== null;

  const displayedAccolist = accolist.slice(startIndex, endIndex);

  const getAccommodationKey = (accommodation) =>
    accommodation?.property?.id ||
    accommodation?.ID ||
    accommodation?.id;

  const loadMoreProperties = useCallback(async ({ page, isCancelled = () => false } = {}) => {
    if (loadMoreInFlightRef.current || !lastEvaluatedKeyCreatedAt) return false;

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);

    try {
      const result = await FetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId);
      if (isCancelled()) return false;

      const newProperties = result.properties ?? [];
      if (newProperties.length > 0) {
        setAccolist((prev) => [...prev, ...newProperties]);
        if (page) {
          setCurrentPage(page);
        }
      }

      if (result.lastEvaluatedKey && newProperties.length > 0) {
        setLastEvaluatedKeyCreatedAt(result.lastEvaluatedKey.createdAt);
        setLastEvaluatedKeyId(result.lastEvaluatedKey.id);
      } else {
        setLastEvaluatedKeyCreatedAt(null);
        setLastEvaluatedKeyId(null);
      }

      return newProperties.length > 0;
    } catch {
      if (!isCancelled()) {
        setLastEvaluatedKeyCreatedAt(null);
        setLastEvaluatedKeyId(null);
      }
      return false;
    } finally {
      loadMoreInFlightRef.current = false;
      if (!isCancelled()) {
        setLoadingMore(false);
      }
    }
  }, [lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId]);

  const handlePageChange = async (page) => {
    if (page < 1) return;
    if (page > totalPages && !hasMore) return;

    if (page > totalPages && hasMore) {
      await loadMoreProperties({ page });
      return;
    }

    setCurrentPage(page);
  };

  const handleFilterApplied = (filteredResults) => {
    setFilterLoading(true);

    setTimeout(() => {
      setAccolist(filteredResults);
      setCurrentPage(1);
      setFilterLoading(false);
      setFiltersOpen(false);
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
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentPage]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  useEffect(() => {
    const isSearchActive = searchResults && searchResults.length > 0;
    if (currentPage !== totalPages || !hasMore || isSearchActive || totalPages === 0) return;

    let cancelled = false;

    loadMoreProperties({ isCancelled: () => cancelled });

    return () => {
      cancelled = true;
    };
  }, [currentPage, totalPages, hasMore, searchResults, loadMoreProperties]);

  if (filterLoading || searchLoading) {
    return (
      <div id="container" className={filtersOpen ? "filters-open" : ""}>
        <div className="filters-mobile-bar">
          <button className="filters-open-btn" type="button" onClick={() => setFiltersOpen(true)}>
            Filters <span>☰</span>
          </button>
        </div>

        <button
          type="button"
          className="filters-overlay"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        />

        <div id="filters-sidebar">
          <div className="filters-drawer-header">
            <span>Filters</span>
            <button type="button" className="filters-close-btn" onClick={() => setFiltersOpen(false)}>
              ✕
            </button>
          </div>

          <FilterUi onFilterApplied={handleFilterApplied} />
        </div>

        <div id="card-visibility">
          {SKELETON_IDS.map((id) => (
            <SkeletonLoader key={id} />
          ))}
        </div>
      </div>
    );
  }

  const handleClick = (e, ID) => {
    if (!e?.target) return;
    if (e.target.closest(".swiper-button-next") || e.target.closest(".swiper-button-prev")) {
      e.stopPropagation();
      return;
    }
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };

  return (
    <>
      <div id="container" className={filtersOpen ? "filters-open" : ""}>
        <div className="filters-mobile-bar">
          <button className="filters-open-btn" type="button" onClick={() => setFiltersOpen(true)}>
            Filters <span>☰</span>
          </button>
        </div>

        <button
          type="button"
          className="filters-overlay"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        />

        <div id="filters-sidebar">
          <div className="filters-drawer-header">
            <span>Filters</span>
            <button type="button" className="filters-close-btn" onClick={() => setFiltersOpen(false)}>
              ✕
            </button>
          </div>

          <FilterUi onFilterApplied={handleFilterApplied} />
        </div>

        <div id="card-visibility">
          {displayedAccolist.length > 0
            ? displayedAccolist.map((accommodation) => {
                return (
                  <AccommodationCard
                    key={getAccommodationKey(accommodation)}
                    accommodation={accommodation}
                    onClick={handleClick}
                    imageVariant="web"
                    variant="listing"
                  />
                );
              })
            : null}
        </div>
      </div>

      <div className={PageSwitcher.pagination}>
        <button
          type="button"
          className={PageSwitcher.arrow}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loadingMore}
          aria-label="Previous page"
        >
          ‹
        </button>

        {getPageNumbers(currentPage, totalPages).map((item) => {
          if (typeof item === "string") {
            return <span key={item} className={PageSwitcher.ellipsis}>…</span>;
          }
          return (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => handlePageChange(item)}
              className={currentPage === item ? PageSwitcher.active : PageSwitcher.page}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          className={PageSwitcher.arrow}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={(currentPage === totalPages && !hasMore) || loadingMore}
          aria-label="Next page"
        >
          {loadingMore ? "…" : "›"}
        </button>
      </div>
    </>
  );
};

Accommodations.propTypes = {
  searchResults: PropTypes.arrayOf(PropTypes.object),
};

Accommodations.defaultProps = {
  searchResults: [],
};

export default Accommodations;
