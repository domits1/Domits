import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import PriceInput from './PriceInput';
import CalendarPricingView from './CalendarPricingView';
import '../styles/DynamicPricingModal.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const handlePriceUpdate = (date, newPrice) => {
  const updatedPriceHistory = priceHistory.map(item => 
    toYMD(item.date) === toYMD(date) 
      ? { ...item, price: newPrice }
      : item
  );
  onPriceHistoryUpdate(updatedPriceHistory);
};
const DynamicPricingModal = ({ 
  isOpen, 
  onClose, 
  basePrice, 
  priceHistory, 
  onBasePriceChange 
}) => {
  const priceData = useMemo(() => {
    const labels = priceHistory.map((entry) => format(entry.date, "dd MMM yyyy"));
    const data = priceHistory.map((entry) => entry.price);
    

    
    return {
      labels,
      datasets: [
        {
          label: "Predicted Price (€)",
          data: data,
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.15)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#3498db",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#2980b9",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [priceHistory]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12,
          font: {
            size: 11,
            weight: '500'
          },
          color: '#666'
        },
        grid: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Price (€)",
          font: {
            size: 12,
            weight: '600'
          },
          color: '#2c3e50',
          padding: {
            top: 10,
            bottom: 10
          }
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#666'
        },
        border: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            size: 12,
            weight: '600'
          },
          color: '#2c3e50',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#2c3e50",
        bodyColor: "#2c3e50",
        borderColor: "#3498db",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12,
          weight: '500'
        },
        callbacks: {
          title: (tooltipItems) => {
            const item = tooltipItems[0];
            return item.label;
          },
          label: (tooltipItem) => {
            const price = tooltipItem.parsed.y;
            return `Price: €${price.toFixed(2)}`;
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button 
          className="close-modal-button" 
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        <h2>AI Dynamic Pricing</h2>

        <div className="chart-container">
          <div style={{ width: '95%', height: '400px', marginBottom: '2rem' }}>
            <Line data={priceData} options={chartOptions} />
          </div>
          <CalendarPricingView priceHistory={priceHistory} onPriceUpdate={handlePriceUpdate}/>
        </div>
      </div>
    </div>
  );
};

DynamicPricingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  basePrice: PropTypes.number.isRequired,
  onPriceHistoryUpdate: PropTypes.func.isRequired,
  priceHistory: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.instanceOf(Date).isRequired,
    price: PropTypes.number.isRequired
  })).isRequired,
  onBasePriceChange: PropTypes.func.isRequired
};

export default DynamicPricingModal;
