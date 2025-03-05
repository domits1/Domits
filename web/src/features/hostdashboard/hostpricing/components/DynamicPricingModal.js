import React from 'react';
import { Line } from 'react-chartjs-2';

export default function DynamicPricingModal({
  isOpen,
  onClose,
  basePrice,
  dynamicPrice,
  predictedPrice,
  priceData,
  chartOptions
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>AI Dynamic Pricing</h2>

        <label>Base Price (€): </label>
        <input
          disabled
          type="number"
          step="0.01"
          value={basePrice}
          onChange={() => {}}
        />

        <p>Current Dynamic Price: €{dynamicPrice}</p>
        <p>Laatste dagvoorspelling (AI): €{predictedPrice}</p>

        <div style={{ width: '100%', overflowX: 'auto', margin: '20px auto' }}>
          <div style={{ width: '3000px', height: '300px' }}>
            <Line data={priceData} options={chartOptions} />
          </div>
        </div>

        <button className="close-modal-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
