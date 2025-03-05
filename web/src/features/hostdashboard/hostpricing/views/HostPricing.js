import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Pages from '../../Pages.js';
import '../styles/HostPricing.css';

import detailsIcon from '../../../../images/icons/content-view-detail-list-icon.svg';
import tableIcon from '../../../../images/icons/content-view-table-list-icon.svg';
import spinner from '../../../../images/spinnner.gif';
import taxFeeIcon from '../../../../images/icons/tax-fee-icon.png';

import { Auth } from 'aws-amplify';

import * as tf from '@tensorflow/tfjs';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

import { vatRates, touristTaxRates } from '../../../../utils/CountryVATRatesAndTouristTaxes.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const itemsPerPageDetails = 3;
const itemsPerPageTable = 7;

function generateRandomTrainingData(basePrice, length = 60) {
  const data = [];
  for (let i = 0; i < length; i++) {
    data.push({
      seasonFactor: Math.random() * 2,
      weekendFactor: Math.random() * 2,
      competitorPrice: basePrice + (Math.random() * 50 - 25),
      eventFactor: Math.random() * 2,
      reviewsFactor: Math.random() * 2,
      occupancyRate: Math.random(),
      propertyTypeFactor: Math.random() + 0.5,
      price: basePrice + (Math.random() * 20 - 10),
    });
  }
  return data;
}

const TaxFeePopup = ({ onClose, rent, cleaningFee, vat, touristTax, domitsFee }) => {
  const totalCost = (
    parseFloat(rent) +
    parseFloat(cleaningFee) +
    parseFloat(domitsFee) +
    parseFloat(vat) +
    parseFloat(touristTax)
  ).toFixed(2);

  return (
    <div className="pricing-taxFee-popup-container">
      <div className="pricing-taxFee-popup-overlay" onClick={onClose} />
      <div className="pricing-taxFee-popup-content">
        <div className="pricing-taxFee-popup-header">
          <h3>Estimate Costs</h3>
          <button className="pricing-taxFee-popup-close-button" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="pricing-taxFee-popup-body">
          <p>Rates per night: <span>€{rent}</span></p>
          <p>Cleaning fee: <span>€{cleaningFee}</span></p>
          <p>Domits Service fee (15%): <span>€{domitsFee}</span></p>
          <p>VAT: <span>€{vat}</span></p>
          <p>Tourist Tax: <span>€{touristTax}</span></p>
          <hr />
          <p>Total Cost: <span>€{totalCost}</span></p>
        </div>
      </div>
    </div>
  );
};

const AIPricingModal = ({
  isLoading,
  basePrice,
  dynamicPrice,
  predictedPrice,
  priceData,
  chartOptions,
  onClose
}) => (
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
      <p>Dynamic Price: €{dynamicPrice}</p>
      <p>Laatste dagvoorspelling (AI): €{predictedPrice}</p>

      {isLoading ? (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <img src={spinner} alt="Loading..." width="50" height="50" />
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto', margin: '20px auto' }}>
          <div style={{ width: '3000px', height: '300px' }}>
            <Line data={priceData} options={chartOptions} />
          </div>
        </div>
      )}

      <button className="close-modal-button" onClick={onClose}>
        Close
      </button>
    </div>
  </div>
);

const AccommodationCard = ({
  accommodation,
  globalIndex,
  editMode,
  editedRates,
  handleRateChange,
  editedCleaningFees,
  handleCleaningFeeChange,
  toggleTaxFeePopup,
  openModal
}) => {
  const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
  const cleaningFeeIncluded = extraServices.some(
    service => service.S === 'Cleaning service (add service fee manually)'
  );

  return (
    <div className="accommodation-card">
      <img
        className="accommodation-card-img"
        src={accommodation.Images?.M?.image1?.S}
        alt={accommodation.Title?.S || 'Accommodation'}
      />
      <div className="accommodation-card-details">
        <div className="pricing-column">
          <p className="pricing-title">{accommodation.Title?.S}</p>
          <p>{accommodation.Country?.S}</p>
          <p>Guests: {accommodation.GuestAmount?.N}</p>
        </div>

        <div className="pricing-column">
          <p className="pricing-rate-input">
            Rate:{' '}
            {editMode ? (
              <input
                type="number"
                step="0.1"
                value={editedRates[globalIndex] || ''}
                onChange={(e) => handleRateChange(e, globalIndex)}
              />
            ) : (
              editedRates[globalIndex] ||
              (accommodation.Rent?.N || accommodation.Rent?.S)
            )}
          </p>
          <button
            className="dynamic-pricing-button"
            onClick={() => openModal(accommodation)}
          >
            Configure Dynamic Pricing
          </button>
          <p className="pricing-rate-input">
            Cleaning Fee:{' '}
            {cleaningFeeIncluded ? (
              editMode ? (
                <input
                  type="number"
                  step="0.1"
                  value={editedCleaningFees[globalIndex] || ''}
                  onChange={(e) => handleCleaningFeeChange(e, globalIndex)}
                />
              ) : (
                editedCleaningFees[globalIndex] ||
                (accommodation.CleaningFee?.N || accommodation.CleaningFee?.S)
              )
            ) : (
              0
            )}
          </p>
          <p>
            Availability:{' '}
            {accommodation.Drafted?.BOOL ? 'Unavailable' : 'Available'}
          </p>
        </div>
      </div>
      <div className="pricing-taxFee-container">
        <img
          className="pricing-taxFee-icon-details"
          src={taxFeeIcon}
          alt="Tax & Fee Button"
          onClick={() => toggleTaxFeePopup(accommodation)}
        />
      </div>
    </div>
  );
};

const AccommodationTableRow = ({
  accommodation,
  globalIndex,
  editMode,
  editedRates,
  handleRateChange,
  editedCleaningFees,
  handleCleaningFeeChange,
  toggleTaxFeePopup
}) => {
  const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
  const cleaningFeeIncluded = extraServices.some(
    service => service.S === 'Cleaning service (add service fee manually)'
  );

  return (
    <tr>
      <td className="pricing-table-title">{accommodation.Title?.S}</td>
      <td>{accommodation.Country?.S}</td>
      <td>{accommodation.GuestAmount?.N}</td>
      <td>
        {editMode ? (
          <input
            type="number"
            step="0.1"
            value={editedRates[globalIndex] || ''}
            onChange={(e) => handleRateChange(e, globalIndex)}
          />
        ) : (
          editedRates[globalIndex] ||
          (accommodation.Rent?.N || accommodation.Rent?.S)
        )}
      </td>
      <td>
        {cleaningFeeIncluded ? (
          editMode ? (
            <input
              type="number"
              step="0.1"
              value={editedCleaningFees[globalIndex] || ''}
              onChange={(e) => handleCleaningFeeChange(e, globalIndex)}
            />
          ) : (
            editedCleaningFees[globalIndex] ||
            (accommodation.CleaningFee?.N || accommodation.CleaningFee?.S)
          )
        ) : (
          0
        )}
      </td>
      <td>{accommodation.Drafted?.BOOL ? 'Unavailable' : 'Available'}</td>
      <td>
        <img
          className="pricing-taxFee-icon-table"
          src={taxFeeIcon}
          alt="Tax & Fee Button"
          onClick={() => toggleTaxFeePopup(accommodation)}
        />
      </td>
    </tr>
  );
};

const HostPricing = () => {
  const [userId, setUserId] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPanel, setCurrentPanel] = useState(1);
  const [viewMode, setViewMode] = useState('details');

  const [editMode, setEditMode] = useState(false);
  const [editedRates, setEditedRates] = useState([]);
  const [originalRates, setOriginalRates] = useState([]);
  const [editedCleaningFees, setEditedCleaningFees] = useState([]);
  const [originalCleaningFees, setOriginalCleaningFees] = useState([]);

  const [taxFeePopup, setTaxFeePopup] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [basePrice, setBasePrice] = useState(0);
  const [dynamicPrice, setDynamicPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [predictedPrice, setPredictedPrice] = useState(0);

  const modelRef = useRef(null);

  const [minVals, setMinVals] = useState(null);
  const [maxVals, setMaxVals] = useState(null);

  useEffect(() => {
    async function fetchUserId() {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
      } catch (error) {
        console.error('Error retrieving user ID:', error);
      }
    }
    fetchUserId();
  }, []);

  const fetchAccommodationsRates = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Read-AccommodationRatesByOwner',
        {
          method: 'POST',
          body: JSON.stringify({ UserId: userId }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
        }
      );
      const data = await response.json();
      if (data.body && typeof data.body === 'string') {
        const parsedBody = JSON.parse(data.body);
        if (Array.isArray(parsedBody)) {
          setAccommodations(parsedBody);
        } else {
          console.error('Retrieved data is not an array:', parsedBody);
        }
      }
    } catch (error) {
      console.error('Error fetching accommodation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAccommodationsRates();
    }
  }, [userId, fetchAccommodationsRates]);

  useEffect(() => {
    if (accommodations.length > 0) {
      const initialRates = accommodations.map(acc => acc.Rent?.N || acc.Rent?.S || '');
      const initialCleaningFees = accommodations.map(acc => acc.CleaningFee?.N || acc.CleaningFee?.S || '');
      setEditedRates(initialRates);
      setOriginalRates(initialRates);
      setEditedCleaningFees(initialCleaningFees);
      setOriginalCleaningFees(initialCleaningFees);
    }
  }, [accommodations]);

  const accommodationsCount = accommodations.length;
  const activeItemsPerPage = viewMode === 'details' ? itemsPerPageDetails : itemsPerPageTable;
  const startIndex = (currentPanel - 1) * activeItemsPerPage;
  const endIndex = currentPanel * activeItemsPerPage;
  const currentAccommodations = accommodations.slice(startIndex, endIndex);

  const handlePageRange = () => {
    const totalPages = Math.ceil(accommodationsCount / activeItemsPerPage);
    let startPage = currentPanel - 2;
    if (startPage < 1) startPage = 1;
    let endPage = startPage + 4;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - 4, 1);
    }
    return { startPage, endPage };
  };
  const { startPage, endPage } = handlePageRange();

  const toggleView = (mode) => {
    setViewMode(mode);
    setCurrentPanel(1);
  };
  const handleDetailsView = () => toggleView('details');
  const handleTableView = () => toggleView('table');

  const toggleTaxFeePopupHandler = (accommodation) => {
    setSelectedAccommodation(accommodation);
    setTaxFeePopup((prev) => !prev);
  };
  const handleClosePopUp = () => {
    setTaxFeePopup(false);
    setSelectedAccommodation(null);
  };

  const handleTaxFeePopup = (details, globalIndex) => {
    const countryVAT = vatRates.find(rate => rate.country === details.Country?.S)?.vat || '0';
    const vatRate = parseFloat(countryVAT) / 100;

    const countryTouristTax = touristTaxRates.find(
      rate => rate.country === details.Country?.S
    )?.touristTax || '0';

    const rent = parseFloat(
      editedRates[globalIndex] || details.Rent?.N || details.Rent?.S || 0
    ).toFixed(2);

    const cleaningFee = parseFloat(
      editedCleaningFees[globalIndex] || details.CleaningFee?.N || details.CleaningFee?.S || 0
    ).toFixed(2);

    const domitsFee = (parseFloat(rent) * 0.15).toFixed(2);
    const vatTax = (parseFloat(rent) * vatRate).toFixed(2);

    let touristTaxValue = 0;
    if (countryTouristTax.includes('%')) {
      const taxRate = parseFloat(countryTouristTax.replace('%', '')) / 100;
      touristTaxValue = (parseFloat(rent) * taxRate).toFixed(2);
    } else if (
      countryTouristTax.includes('EUR') ||
      countryTouristTax.includes('USD') ||
      countryTouristTax.includes('GBP')
    ) {
      touristTaxValue = parseFloat(countryTouristTax.replace(/[^\d.]/g, '') || 0).toFixed(2);
    }

    return (
      <TaxFeePopup
        onClose={handleClosePopUp}
        rent={rent}
        cleaningFee={cleaningFee}
        vat={vatTax}
        touristTax={touristTaxValue}
        domitsFee={domitsFee}
      />
    );
  };

  const handleEditMode = () => setEditMode((prev) => !prev);

  const handleRateChange = (e, index) => {
    const updatedRates = [...editedRates];
    updatedRates[index] = e.target.value;
    setEditedRates(updatedRates);
  };

  const handleCleaningFeeChange = (e, index) => {
    const updatedCleaningFees = [...editedCleaningFees];
    updatedCleaningFees[index] = e.target.value;
    setEditedCleaningFees(updatedCleaningFees);
  };

  const handleSaveRates = async () => {
    try {
      const updatedAccommodations = accommodations.map((acc, i) => {
        const extraServices = acc.Features?.M?.ExtraServices?.L || [];
        const cleaningFeeIncluded = extraServices.some(
          service => service.S === 'Cleaning service (add service fee manually)'
        );

        if (!editedRates[i]) {
          throw new Error('Rent is missing or empty for an accommodation.');
        }

        if (cleaningFeeIncluded && !editedCleaningFees[i]) {
          throw new Error(
            'CleaningFee is missing or empty for an accommodation that needs cleaning.'
          );
        }

        const rent = parseFloat(editedRates[i]);
        const cleaningFee = cleaningFeeIncluded ? parseFloat(editedCleaningFees[i]) : 0;

        if (rent < 0 || cleaningFee < 0) {
          throw new Error('Negative values detected for Rent or CleaningFee.');
        }

        const roundedRent = Math.max(0, rent).toFixed(2);
        const roundedCleaningFee = Math.max(0, cleaningFee).toFixed(2);
        const serviceFee = Math.max(0, 0.15 * parseFloat(rent)).toFixed(2);

        return {
          AccommodationId: acc.ID.S,
          OwnerId: userId,
          Rent: roundedRent,
          CleaningFee: roundedCleaningFee,
          ServiceFee: serviceFee
        };
      });

      const response = await fetch(
        'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationRates',
        {
          method: 'PUT',
          body: JSON.stringify({ Accommodations: updatedAccommodations }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
        }
      );

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);

      if (parsedBody && typeof parsedBody === 'object') {
        const updatedRatesList = parsedBody.map(
          (acc) => acc.Rent?.N || acc.Rent?.S || ''
        );
        const updatedCleaningFeesList = parsedBody.map(
          (acc) => acc.CleaningFee?.N || acc.CleaningFee?.S || ''
        );
        setOriginalRates(updatedRatesList);
        setOriginalCleaningFees(updatedCleaningFeesList);
        setEditMode(false);
        console.log('Rates updated successfully');
        fetchAccommodationsRates();
      } else {
        console.error('Rates update failed:', parsedBody);
      }
    } catch (error) {
      console.error('Rates update failed:', error);
    }
  };

  const handleUndo = () => {
    setEditedRates([...originalRates]);
    setEditedCleaningFees([...originalCleaningFees]);
  };

  const trainAIModel = async (data) => {
    const features = [
      'seasonFactor', 'weekendFactor', 'competitorPrice', 'eventFactor',
      'reviewsFactor', 'occupancyRate', 'propertyTypeFactor', 'price'
    ];

    const mins = {};
    const maxs = {};
    features.forEach(feature => {
      const values = data.map(d => d[feature]);
      mins[feature] = Math.min(...values);
      maxs[feature] = Math.max(...values);
    });
    setMinVals(mins);
    setMaxVals(maxs);

    if (modelRef.current) {
      modelRef.current.dispose();
      modelRef.current = null;
    }

    const newModel = tf.sequential();
    newModel.add(tf.layers.dense({ units: 16, inputShape: [7], activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 1 }));

    newModel.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    });

    const scaleValue = (value, min, max) => {
      return (max === min) ? 0.5 : (value - min) / (max - min);
    };

    const xsArray = data.map(d => ([
      scaleValue(d.seasonFactor, mins.seasonFactor, maxs.seasonFactor),
      scaleValue(d.weekendFactor, mins.weekendFactor, maxs.weekendFactor),
      scaleValue(d.competitorPrice, mins.competitorPrice, maxs.competitorPrice),
      scaleValue(d.eventFactor, mins.eventFactor, maxs.eventFactor),
      scaleValue(d.reviewsFactor, mins.reviewsFactor, maxs.reviewsFactor),
      scaleValue(d.occupancyRate, mins.occupancyRate, maxs.occupancyRate),
      scaleValue(d.propertyTypeFactor, mins.propertyTypeFactor, maxs.propertyTypeFactor)
    ]));
    const ysArray = data.map(d => ([
      scaleValue(d.price, mins.price, maxs.price)
    ]));

    const xs = tf.tensor2d(xsArray);
    const ys = tf.tensor2d(ysArray);

    const earlyStopping = tf.callbacks.earlyStopping({
      monitor: 'val_loss',
      patience: 10,
      restoreBestWeights: true
    });

    try {
      await newModel.fit(xs, ys, {
        epochs: 150,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: [earlyStopping]
      });
      modelRef.current = newModel;
      return newModel;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  };

  const predictFuturePrices = async (trainedModel, basePrice, country, events = []) => {
    if (!trainedModel || !minVals || !maxVals) {
      console.warn('Model of min/max waarden niet beschikbaar.');
      return [];
    }

    const scaleValue = (value, min, max) => {
      return (max === min) ? 0.5 : (value - min) / (max - min);
    };

    const predictions = [];
    const today = new Date();

    const seasonalMultipliers = {
      default: { summer: [1.1, 1.2], autumn: [0.9, 1.0], winter: [1.0, 1.1], spring: [1.0, 1.1] },
      Zwitserland: { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Oostenrijk: { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Australië: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Argentinië: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
    };

    const holidayMultipliers = {
      '01-01': 1.3,
      '12-25': 1.5,
      '12-26': 1.5,
      '12-31': 1.4,
      '14-02': 1.4,
      '05-05': 1.1,
      '05-12': 1.2,
      '04-27': 1.2
    };

    const defaultReviewsFactor = 1.0;
    const defaultOccupancyRate = 0.5;
    const defaultPropertyTypeFactor = 1.0;

    const getSeason = (month) => {
      if (month >= 6 && month <= 8) return 'summer';
      if (month >= 9 && month <= 11) return 'autumn';
      if (month === 12 || month <= 2) return 'winter';
      return 'spring';
    };

    for (let i = 1; i <= 365; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);

      const month = futureDate.getMonth() + 1;
      const dayOfWeek = futureDate.getDay();
      const dateKey = `${String(month).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

      const season = getSeason(month);
      const countrySeasons = seasonalMultipliers[country] || seasonalMultipliers.default;
      const seasonalMultiplier = (countrySeasons[season][0] + countrySeasons[season][1]) / 2;
      const holidayFactor = holidayMultipliers[dateKey] || 1.0;
      const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.1 : 1.0;

      let eventMultiplier = 1.0;
      const eventToday = events.find(ev => {
        const evDate = new Date(ev.date);
        return evDate.toDateString() === futureDate.toDateString();
      });
      if (eventToday) {
        eventMultiplier = eventToday.factor || 1.2;
      }

      const adjustedPrice = basePrice *
        seasonalMultiplier *
        holidayFactor *
        weekendMultiplier *
        eventMultiplier;

      const input = [
        scaleValue(seasonalMultiplier, minVals.seasonFactor, maxVals.seasonFactor),
        scaleValue(weekendMultiplier, minVals.weekendFactor, maxVals.weekendFactor),
        scaleValue(basePrice, minVals.competitorPrice, maxVals.competitorPrice),
        scaleValue(eventMultiplier, minVals.eventFactor, maxVals.eventFactor),
        scaleValue(defaultReviewsFactor, minVals.reviewsFactor, maxVals.reviewsFactor),
        scaleValue(defaultOccupancyRate, minVals.occupancyRate, maxVals.occupancyRate),
        scaleValue(defaultPropertyTypeFactor, minVals.propertyTypeFactor, maxVals.propertyTypeFactor),
      ];

      try {
        const inputTensor = tf.tensor2d([input], [1, 7]);
        const outputTensor = trainedModel.predict(inputTensor);
        const aiPriceScaled = (await outputTensor.data())[0];

        const aiPrice = aiPriceScaled * (maxVals.price - minVals.price) + minVals.price;

        const finalPrice = (adjustedPrice + aiPrice) / 2;

        predictions.push({
          date: futureDate,
          price: parseFloat(finalPrice.toFixed(2))
        });

        inputTensor.dispose();
        outputTensor.dispose();
      } catch (error) {
        console.error(`Error during prediction for day ${i}:`, error);
        predictions.push({
          date: futureDate,
          price: parseFloat(adjustedPrice.toFixed(2)),
          error: true
        });
      }
    }

    return predictions;
  };

  const openModal = async (accommodation) => {
    setSelectedAccommodation(accommodation);
    if (!accommodation?.ID?.S) {
      console.error('No valid ID for the accommodation:', accommodation);
      return;
    }

    try {
      const accommodationIndex = accommodations.indexOf(accommodation);
      const storedRent = parseFloat(
        editedRates[accommodationIndex] ??
        accommodation?.Rent?.N ??
        accommodation?.Rent?.S
      ) || 100;
      setBasePrice(storedRent);

      const trainingData = generateRandomTrainingData(storedRent, 60);

      setIsLoading(true);
      const trainedModel = await trainAIModel(trainingData);

      const events = [];
      const future = await predictFuturePrices(
        trainedModel,
        storedRent,
        accommodation.Country?.S || 'default',
        events
      );

      if (future.length > 0) {
        setPredictedPrice(future[future.length - 1].price);
      } else {
        setPredictedPrice(0);
      }
      setPriceHistory(future);

    } catch (error) {
      console.error('Error opening modal:', error);
    } finally {
      setIsLoading(false);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAccommodation(null);
  };

  useEffect(() => {
    if (basePrice) {
      setDynamicPrice(basePrice);
    }
  }, [basePrice]);

  const priceData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = priceHistory.map((entry) => format(new Date(entry.date), 'dd MMM yyyy'));
    const data = priceHistory.map((entry) => entry.price);

    return {
      labels,
      datasets: [
        {
          label: 'Predicted Price (€)',
          data,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
          tension: 0.3,
        }
      ]
    };
  }, [priceHistory]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12,
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price (€)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (tooltipItems) => tooltipItems[0].label,
          label: (tooltipItem) => `Price: €${tooltipItem.parsed.y}`,
        }
      }
    }
  };

  return (
    <div className="containerHostPricing">
      <div className="host-pricing-header">
        <h2 className="host-pricing-title">Pricing</h2>
        <div className="host-pricing-header-buttons">
          <button className="refresh-accommodation-button" onClick={fetchAccommodationsRates}>
            Refresh
          </button>
          <div className="pricing-switch-layout-button">
            <button className="details-switch-button" onClick={handleDetailsView}>
              <img src={detailsIcon} alt="detailsView" />
            </button>
            <button className="table-switch-button" onClick={handleTableView}>
              <img src={tableIcon} alt="tableView" />
            </button>
          </div>
        </div>
      </div>

      <div className="hostdashboard-container">
        <Pages />

        <div className="host-pricing-container">
          {isLoading ? (
            <div>
              <img src={spinner} alt="Loading..." />
            </div>
          ) : viewMode === 'details' ? (
            <div className="pricing-details-view">
              <div className="accommodation-cards">
                {currentAccommodations.map((accommodation, index) => {
                  const globalIndex = startIndex + index;
                  return (
                    <AccommodationCard
                      key={accommodation.ID?.S || index}
                      accommodation={accommodation}
                      globalIndex={globalIndex}
                      editMode={editMode}
                      editedRates={editedRates}
                      handleRateChange={handleRateChange}
                      editedCleaningFees={editedCleaningFees}
                      handleCleaningFeeChange={handleCleaningFeeChange}
                      toggleTaxFeePopup={toggleTaxFeePopupHandler}
                      openModal={openModal}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pricing-table-view">
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th className="pricing-table-title">Title</th>
                    <th>Country</th>
                    <th className="pricing-table-guestAmount">Guests</th>
                    <th>Rate</th>
                    <th>Cleaning Fee</th>
                    <th>Availability</th>
                    <th>Tax & Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAccommodations.map((accommodation, index) => {
                    const globalIndex = startIndex + index;
                    return (
                      <AccommodationTableRow
                        key={accommodation.ID?.S || index}
                        accommodation={accommodation}
                        globalIndex={globalIndex}
                        editMode={editMode}
                        editedRates={editedRates}
                        handleRateChange={handleRateChange}
                        editedCleaningFees={editedCleaningFees}
                        handleCleaningFeeChange={handleCleaningFeeChange}
                        toggleTaxFeePopup={toggleTaxFeePopupHandler}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {taxFeePopup && selectedAccommodation && handleTaxFeePopup(
            selectedAccommodation,
            accommodations.indexOf(selectedAccommodation)
          )}

          {isModalOpen && selectedAccommodation && (
            <AIPricingModal
              isLoading={isLoading}
              basePrice={basePrice}
              dynamicPrice={dynamicPrice}
              predictedPrice={predictedPrice}
              priceData={priceData}
              chartOptions={chartOptions}
              onClose={closeModal}
            />
          )}

          <div className="pricing-bottom-buttons">
            <div className="pricing-navigation-buttons">
              <button
                className="pricing-prev-nav-button"
                onClick={() => setCurrentPanel(Math.max(currentPanel - 1, 1))}
                disabled={currentPanel === 1}
              >
                Previous
              </button>
              {[...Array(endPage - startPage + 1)].map((_, idx) => {
                const pageIndex = startPage + idx;
                return (
                  <button
                    key={pageIndex}
                    className={`pricing-pagenumber-nav-button ${
                      currentPanel === pageIndex ? 'active' : ''
                    }`}
                    onClick={() => setCurrentPanel(pageIndex)}
                  >
                    {pageIndex}
                  </button>
                );
              })}
              <button
                className="pricing-next-nav-button"
                onClick={() =>
                  setCurrentPanel(
                    Math.min(
                      currentPanel + 1,
                      Math.ceil(accommodationsCount / activeItemsPerPage)
                    )
                  )
                }
                disabled={
                  currentPanel === Math.ceil(accommodationsCount / activeItemsPerPage)
                }
              >
                Next
              </button>
            </div>

            <div className="pricing-action-buttons">
              <button onClick={handleEditMode}>
                {editMode ? 'Cancel Edit' : 'Edit'}
              </button>
              <button onClick={handleUndo}>Undo</button>
              <button className="pricing-action-save" onClick={handleSaveRates}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPricing;
