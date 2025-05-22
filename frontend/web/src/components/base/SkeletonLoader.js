// SkeletonLoader.js
import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = () => (
    <div className="skeleton-card">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-detail"></div>
        <div className="skeleton-specs">
          <div className="skeleton-size"></div>
          <div className="skeleton-size"></div>
          <div className="skeleton-size"></div>
        </div>
      </div>
    </div>
);

export default SkeletonLoader;
