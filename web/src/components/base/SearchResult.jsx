//de search-bar type gedeelte

// SearchResult.jsx
import React from 'react';
import './SearchResult.css';

export const SearchResult = ({ result, handleResultClick }) => {
  return (
    <div className='search-result' onClick={() => handleResultClick(result)}>
      {result ? (
        <>
          <p>{result.name}</p>
          {result.type === 'country' && result.countryCode && <p>{result.countryCode}</p>}
          {result.type === 'city' && result.countryCode && <p>{result.countryCode}</p>}
        </>
      ) : (
        <p>Land of stad niet gevonden</p>
      )}
    </div>
  );
};


