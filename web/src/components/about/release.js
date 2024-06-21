import React from "react";
import './release.css'
import release from '../../images/release.png';

function Release() {
    return (
        <div className="release">
            <div className="release-header">
              <h1>What’s New</h1> 
              <h4>Innovative Vacation Rentals.</h4>
              <h4>Redesigned for You.</h4>
              <img src={release} alt="Release" />
            </div>
        </div>


);
}

export default Release;