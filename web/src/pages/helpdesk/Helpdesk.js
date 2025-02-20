// import React from 'react';
// import './helpdesk.css';
// import FAQ from "../landingpage/Faq";

// const Helpdesk = ({ category }) => {

//   return (
//     <div className="helpContainer">
//       <div className="helpSearchWrapper">
//         <input
//             type="text"
//             placeholder="What do you need help with?"
//             className="helpSearchInput"
//         />
//         <button type="submit" className="helpSearchButton">
//             Search
//         </button>
//       </div>

//         <div>
//             <FAQ category={category}/>
//         </div>
//     </div>
//   );
// };

// export default Helpdesk;

import React, {useState} from 'react'
import './helpdesk.css'
import FAQ from '../landingpage/Faq'

const Helpdesk = ({category}) => {
  const [searchQuery, setSearchQuery] = useState('') // State voor de zoekterm

  return (
    <div className="helpContainer">
      <div className="helpSearchWrapper">
        <input
          type="text"
          placeholder="What do you need help with?"
          className="helpSearchInput"
          value={searchQuery} // Waarde van het zoekveld
          onChange={e => setSearchQuery(e.target.value)} // Functie om de zoekterm bij te werken
        />
      </div>

      <div>
        <FAQ category={category} searchQuery={searchQuery} />{' '}
        {/* Stuur de zoekterm naar FAQ */}
      </div>
    </div>
  )
}

export default Helpdesk
