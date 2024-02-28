import React from 'react';
import './SearchResult.css';

export const SearchResult = ({ result, handleResultClick }) => {
  return (
    <div className='search-result' onClick={() => handleResultClick && handleResultClick(result)}>
      {result ? (
        <>
          <p>
            {result.name} {result.countryCode && `(${result.countryCode})`}
          </p>
        </>
      ) : (
        <p>Land of stad niet gevonden</p>
      )}
    </div>
  );
};


