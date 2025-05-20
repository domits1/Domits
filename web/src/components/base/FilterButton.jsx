import { useState } from 'react';
import { FaSlidersH  } from 'react-icons/fa';
import FilterModal from './FilterModal'; 
import './FilterButton.css';

const FilterButton = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button className="filter-button" onClick={() => setModalOpen(true)}>
        <FaSlidersH size={15}/>  
         <span className="filter-text">Filter</span>
      </button>
      <FilterModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default FilterButton;