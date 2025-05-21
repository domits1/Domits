import { useState } from 'react';
import { FaSlidersH } from 'react-icons/fa';
import FilterModal from './FilterModal'; 
import './FilterButton.scss';

const FilterButton = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

 return (
  <div className="filters-container">
    <button
      className="filter-button"
      onClick={openModal}
    >
      <FaSlidersH size={15} />
      <span className="filter-text">Filter</span>
    </button>
    <FilterModal isOpen={isModalOpen} onClose={closeModal} />
  </div>
);

};

export default FilterButton;
