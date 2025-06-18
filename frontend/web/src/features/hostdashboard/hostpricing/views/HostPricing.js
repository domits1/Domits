import React, { useEffect, useState, useMemo, useRef } from "react";
import Pages from "../../Pages.js";
import "../styles/HostPricing.css";
import detailsIcon from "../../../../images/icons/content-view-detail-list-icon.svg";
import tableIcon from "../../../../images/icons/content-view-table-list-icon.svg";
import { Auth } from "aws-amplify";
import spinner from "../../../../images/spinnner.gif";
import taxFeeIcon from "../../../../images/icons/tax-fee-icon.png";
import { getAccessToken } from "../../../../services/getAccessToken.js";

import dynamicPricing from "../../../../images/dynamic-pricing-icon.png";

import { vatRates, touristTaxRates } from "../../../../utils/CountryVATRatesAndTouristTaxes.js";

import * as tf from "@tensorflow/tfjs";
import { Line } from "react-chartjs-2";
import { format, compareAsc } from "date-fns";

import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const HostPricing = () => {
  const [viewMode, setViewMode] = useState("details");
  const [userId, setUserId] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPannel, setCurrentPannel] = useState(1);

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

  const modelRefs = useRef({});

  useEffect(() => {
    const setUserIdAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
      } catch (error) {
        console.error("Error setting user id:", error);
      }
    };
    setUserIdAsync();
  }, []);

  const fetchAccommodationsRates = async () => {
    setIsLoading(true);
    if (!userId) return;

    try {
      const response = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
        {
          method: "GET",
          headers: {
            Authorization: getAccessToken(),
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setAccommodations(data);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccommodationsRates();
  }, [userId]);

  useEffect(() => {
    if (accommodations.length > 0) {
      const initialRates = accommodations.map((acc) => acc.Rent?.N || acc.Rent?.S || "");
      const initialCleaningFees = accommodations.map((acc) => acc.CleaningFee?.N || acc.CleaningFee?.S || "");
      setEditedRates(initialRates);
      setOriginalRates(initialRates);
      setEditedCleaningFees(initialCleaningFees);
      setOriginalCleaningFees(initialCleaningFees);
    }
  }, [accommodations]);

  const accommodationsLength = accommodations.length;
  const itemsPerPageDetails = 3;
  const itemsPerPageTable = 7;
  const activeItemsPerPage = viewMode === "details" ? itemsPerPageDetails : itemsPerPageTable;
  const startIndex = (currentPannel - 1) * activeItemsPerPage;
  const endIndex = currentPannel * activeItemsPerPage;
  const currentAccommodations = accommodations.slice(startIndex, endIndex);

  const pricingPannel = (pannelNumber) => setCurrentPannel(pannelNumber);
  const handlePageRange = () => {
    const totalPages = Math.ceil(accommodationsLength / activeItemsPerPage);
    let startPage = currentPannel - 2;
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
    setCurrentPannel(1);
  };
  const handleDetailsView = () => toggleView("details");
  const handleTableView = () => toggleView("table");

  const toggleTaxFeePopup = (accommodation) => {
    setSelectedAccommodation(accommodation);
    setTaxFeePopup(!taxFeePopup);
  };
  const handleClosePopUp = () => setTaxFeePopup(false);

  const handleTaxFeePopup = (details, globalIndex) => {
    const countryVAT = vatRates.find((rate) => rate.country === details.Country?.S)?.vat || "0";
    const vatRate = parseFloat(countryVAT) / 100;
    const countryTouristTax = touristTaxRates.find((rate) => rate.country === details.Country?.S)?.touristTax || "0";

    const rent = parseFloat(editedRates[globalIndex] || details.Rent?.N || details.Rent?.S || 0).toFixed(2);

    const cleaningFee = parseFloat(
      editedCleaningFees[globalIndex] || details.CleaningFee?.N || details.CleaningFee?.S || 0
    ).toFixed(2);

    const domitsFee = (parseFloat(rent) * 0.15).toFixed(2);
    const vatTax = (parseFloat(rent) * vatRate).toFixed(2);

    let touristTax;
    if (countryTouristTax.includes("%")) {
      const taxRate = parseFloat(countryTouristTax.replace("%", "")) / 100;
      touristTax = (parseFloat(rent) * taxRate).toFixed(2);
    } else if (
      countryTouristTax.includes("EUR") ||
      countryTouristTax.includes("USD") ||
      countryTouristTax.includes("GBP")
    ) {
      touristTax = parseFloat(countryTouristTax.replace(/[^\d.]/g, "") || 0).toFixed(2);
    } else {
      touristTax = "0.00";
    }

    const totalCost = (
      parseFloat(rent) +
      parseFloat(cleaningFee) +
      parseFloat(domitsFee) +
      parseFloat(vatTax) +
      parseFloat(touristTax)
    ).toFixed(2);

    return (
      <div className="pricing-taxFee-popup-container">
        <div className="pricing-taxFee-popup-overlay" onClick={handleClosePopUp}></div>
        <div className="pricing-taxFee-popup-content">
          <div className="pricing-taxFee-popup-header">
            <h3>Estimate Costs</h3>
            <button className="pricing-taxFee-popup-close-button" onClick={handleClosePopUp}>
              ✖
            </button>
          </div>
          <div className="pricing-taxFee-popup-body">
            <p>
              Rates per night: <span>€{rent}</span>
            </p>
            <p>
              Cleaning fee: <span>€{cleaningFee}</span>
            </p>
            <p>
              Domits Service fee 15%: <span>€{domitsFee}</span>
            </p>
            <p>
              VAT Tax ({countryVAT}%): <span>€{vatTax}</span>
            </p>
            <p>
              Tourist Tax: <span>€{touristTax}</span>
            </p>
            <hr />
            <p>
              Total Cost: <span>€{totalCost}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  function getMinDate(priceHistory) {
    if (!priceHistory.length) return null;
    return priceHistory.reduce(
      (minDate, item) => (compareAsc(item.date, minDate) < 0 ? item.date : minDate),
      priceHistory[0].date
    );
  }

  function getMaxDate(priceHistory) {
    if (!priceHistory.length) return null;
    return priceHistory.reduce(
      (maxDate, item) => (compareAsc(item.date, maxDate) > 0 ? item.date : maxDate),
      priceHistory[0].date
    );
  }

  function createDateRange(start, end) {
    let dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  function toYMD(date) {
    return format(date, "yyyy-MM-dd");
  }

  function chunkIntoWeeks(dates) {
    const weeks = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }
    return weeks;
  }

  function getPriceForDate(date, priceHistory) {
    const dayKey = toYMD(date);
    const found = priceHistory.find((item) => toYMD(item.date) === dayKey);
    return found ? found.price : null;
  }

  function CalendarPricingView({ priceHistory }) {
    const minDate = getMinDate(priceHistory);
    const maxDate = getMaxDate(priceHistory);
    if (!minDate || !maxDate) return null;

    const allPrices = priceHistory.map((item) => item.price);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    const getCellBackgroundColor = (price) => {
      if (price == null) return "#f7f7f7";

      if (maxPrice === minPrice) return "#a9d08e";
      const factor = (price - minPrice) / (maxPrice - minPrice);
      const hue = 120;
      const saturation = 45;
      const lightness = 92 - factor * 45;

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const allDates = createDateRange(minDate, maxDate);
    const weeks = chunkIntoWeeks(allDates);
    const weekDayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div className="enhanced-calendar-wrapper">
        <h3 className="calendar-title">Calendar View</h3>
        <table className="enhanced-calendar-table">
          <thead>
            <tr>
              {weekDayHeaders.map((dayName) => (
                <th key={dayName}>{dayName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIndex) => (
              <tr key={wIndex}>
                {week.map((date, dIndex) => {
                  const price = getPriceForDate(date, priceHistory);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <td
                      key={dIndex}
                      className={`calendar-day ${isWeekend ? "weekend-day" : ""}`}
                      style={{
                        backgroundColor: getCellBackgroundColor(price),
                      }}>
                      <input
                        type="number"
                        className="calendar-price-input"
                        step="0.01"
                        value={price ?? ""}
                        onChange={(e) => handleCalendarPriceChange(date, e.target.value)}
                        style={{ width: "60px", fontSize: "12px" }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const handleEditMode = () => setEditMode(!editMode);
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

  const handleCalendarPriceChange = (date, newPrice) => {
    const updated = priceHistory.map((item) => {
      if (format(item.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) {
        return { ...item, price: parseFloat(newPrice) || 0 };
      }
      return item;
    });
    setPriceHistory(updated);
  };

  const handleSaveRates = async () => {
    try {
      const updatedAccommodations = accommodations.map((acc, i) => {
        const extraServices = acc.Features?.M?.ExtraServices?.L || [];
        const cleaningFeeIncluded = extraServices.some(
          (service) => service.S === "Cleaning service (add service fee manually)"
        );

        if (editedRates[i] === undefined || editedRates[i] === "") {
          throw new Error(`Rent is missing or empty for accommodation: ${acc.Title?.S}`);
        }

        if (cleaningFeeIncluded && (editedCleaningFees[i] === undefined || editedCleaningFees[i] === "")) {
          throw new Error(`CleaningFee is missing or empty for accommodation: ${acc.Title?.S}`);
        }

        const rent = parseFloat(editedRates[i]);
        const cleaningFee = cleaningFeeIncluded ? parseFloat(editedCleaningFees[i]) : 0;

        if (rent < 0 || cleaningFee < 0) {
          throw new Error(
            `Negative value detected for accommodation: ${acc.Title?.S}. Rent: ${rent}, CleaningFee: ${cleaningFee}`
          );
        }

        const roundedRent = Math.max(0, rent).toFixed(2);
        const roundedCleaningFee = Math.max(0, cleaningFee).toFixed(2);
        const serviceFee = Math.max(0, 0.15 * parseFloat(rent)).toFixed(2);

        return {
          AccommodationId: acc.ID.S,
          OwnerId: userId,
          Rent: roundedRent,
          CleaningFee: roundedCleaningFee,
          ServiceFee: serviceFee,
        };
      });

      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/Host-Onboarding-Production-Update-AccommodationRates",
        {
          method: "PUT",
          body: JSON.stringify({ Accommodations: updatedAccommodations }),
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        }
      );

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);

      if (parsedBody && typeof parsedBody === "object") {
        const updatedRates = parsedBody.map((acc) => acc.Rent.N || acc.Rent.S || "");
        const updatedCleaningFees = parsedBody.map((acc) => acc.CleaningFee.N || acc.CleaningFee.S || "");
        setOriginalRates(updatedRates);
        setOriginalCleaningFees(updatedCleaningFees);
        setEditMode(false);
        alert("Rates updated successfully");
        fetchAccommodationsRates();
      } else {
        console.error("Rates update failed:", parsedBody);
      }
    } catch (error) {
      alert("Rates update failed");
      console.error("Error updating rates:", error);
    }
  };

  const handleUndo = () => {
    setEditedRates([...originalRates]);
    setEditedCleaningFees([...originalCleaningFees]);
  };

  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  const generateTrainingDataForAccommodation = (accommodationId, basePrice, numDays = 60) => {
    let data = [];
    let startDate = new Date();

    const seed = accommodationId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < numDays; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() - (numDays - i));

      const rand1 = seededRandom(seed + i * 0.1);
      const rand2 = seededRandom(seed + i * 0.2);
      const rand3 = seededRandom(seed + i * 0.3);
      const rand4 = seededRandom(seed + i * 0.4);

      let month = day.getMonth() + 1;
      let dayOfWeek = day.getDay();

      let seasonalFactor = 1.0;
      if (month >= 6 && month <= 8) {
        seasonalFactor = 1.2;
      } else if (month >= 9 && month <= 11) {
        seasonalFactor = 0.9;
      } else if (month === 12 || month <= 2) {
        seasonalFactor = 1.05;
      } else if (month >= 3 && month <= 5) {
        seasonalFactor = 1.1;
      }

      let weekendFactor = dayOfWeek === 5 || dayOfWeek === 6 ? 1.05 : 1.0;

      let competitorPrice = basePrice + (rand1 - 0.5) * 60;

      let eventFactor = rand2 < 0.1 ? 1.2 : 1.0;

      let occupancyRate = 0.4 + rand3 * 0.6;
      let localAttractionsPopularity = 0.8 + rand4 * 0.4;

      let noiseFactor = 1 + (rand3 - 0.5) * 0.1;

      let finalPrice =
        basePrice *
        seasonalFactor *
        weekendFactor *
        eventFactor *
        occupancyRate *
        localAttractionsPopularity *
        (0.5 + competitorPrice / (basePrice * 2)) *
        noiseFactor;

      data.push({
        date: day,
        seasonalFactor,
        weekendFactor,
        competitorPrice,
        eventFactor,
        occupancyRate,
        localAttractionsPopularity,
        price: parseFloat(finalPrice.toFixed(2)),
      });
    }
    return data;
  };

  const trainOrGetModel = async (accommodationId, trainingData) => {
    if (modelRefs.current[accommodationId]) {
      return modelRefs.current[accommodationId];
    }

    const newModel = tf.sequential();

    newModel.add(tf.layers.dense({ units: 16, inputShape: [6], activation: "relu" }));
    newModel.add(tf.layers.dense({ units: 8, activation: "relu" }));
    newModel.add(tf.layers.dense({ units: 1 }));

    newModel.compile({ optimizer: "adam", loss: "meanSquaredError" });

    const xs = tf.tensor2d(
      trainingData.map((d) => [
        d.seasonalFactor,
        d.weekendFactor,
        d.competitorPrice,
        d.eventFactor,
        d.occupancyRate,
        d.localAttractionsPopularity,
      ])
    );
    const ys = tf.tensor2d(trainingData.map((d) => [d.price]));

    await newModel.fit(xs, ys, { epochs: 80 });
    xs.dispose();
    ys.dispose();

    modelRefs.current[accommodationId] = newModel;
    return newModel;
  };

  const fetchEventsInLocation = async (location) => {
    return [];
  };

  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function smoothPrices(prices, windowSize = 7) {
    let smoothed = [];
    for (let i = 0; i < prices.length; i++) {
      let start = Math.max(0, i - (windowSize - 1));
      let subset = prices.slice(start, i + 1);
      let sum = subset.reduce((acc, val) => acc + val.price, 0);
      let avg = sum / subset.length;
      smoothed.push({
        date: prices[i].date,
        price: parseFloat(avg.toFixed(2)),
      });
    }
    return smoothed;
  }

  const predictFuturePrices = async (trainedModel, basePrice, country, accommodationId, events) => {
    let future = [];
    let today = new Date();

    const seasonalMultipliers = {
      default: { summer: [1.1, 1.2], autumn: [0.9, 1.0], winter: [1.0, 1.1], spring: [1.0, 1.1] },
      Zwitserland: { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Oostenrijk: { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Australië: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Argentinië: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Brazilië: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Canada: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Chili: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      China: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Frankrijk: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Duitsland: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      India: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Italië: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Japan: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Mexico: { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Nederland: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Portugal: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Rusland: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Spanje: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      Zweden: { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
    };

    const countrySeason = seasonalMultipliers[country] || seasonalMultipliers["default"];

    const holidayMultipliers = {
      "01-01": 1.3,
      "12-25": 1.5,
      "12-26": 1.5,
      "12-31": 1.4,
      "14-02": 1.4,
      "05-05": 1.1,
      "05-12": 1.2,
      "04-27": 1.2,
    };

    const seed = accommodationId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 1; i <= 365; i++) {
      let day = new Date(today);
      day.setDate(today.getDate() + i);

      const rand1 = seededRandom(seed + i * 0.11);
      const rand2 = seededRandom(seed + i * 0.22);
      const rand3 = seededRandom(seed + i * 0.33);
      const rand4 = seededRandom(seed + i * 0.44);

      let month = day.getMonth() + 1;
      let dayOfWeek = day.getDay();

      let seasonalMultiplier = 1.0;
      if (month >= 6 && month <= 8 && countrySeason.summer) {
        const [min, max] = countrySeason.summer;
        seasonalMultiplier = min + rand1 * (max - min);
      } else if (month >= 9 && month <= 11 && countrySeason.autumn) {
        const [min, max] = countrySeason.autumn;
        seasonalMultiplier = min + rand1 * (max - min);
      } else if ((month === 12 || month <= 2) && countrySeason.winter) {
        const [min, max] = countrySeason.winter;
        seasonalMultiplier = min + rand1 * (max - min);
      } else if (month >= 3 && month <= 5 && countrySeason.spring) {
        const [min, max] = countrySeason.spring;
        seasonalMultiplier = min + rand1 * (max - min);
      }

      let dateKey = `${month.toString().padStart(2, "0")}-${day.getDate().toString().padStart(2, "0")}`;
      let holidayMultiplier = holidayMultipliers[dateKey] || 1.0;

      let weekendMultiplier = dayOfWeek === 5 || dayOfWeek === 6 ? 1.05 + rand2 * 0.05 : 1.0;

      let eventMultiplier = 1.0;
      if (Array.isArray(events) && events.length > 0) {
        let eventToday = events.find((event) => {
          let eventDate = new Date(event.date);
          return eventDate.toDateString() === day.toDateString();
        });
        if (eventToday) {
          eventMultiplier = eventToday.factor || 1.3;
        }
      }
      let occupancyRate = 0.75 + rand3 * 0.2;
      let localAttractionsPopularity = 0.9 + rand4 * 0.2;

      let competitorPrice = basePrice + (rand3 - 0.5) * 20;
      let adjustedPrice = basePrice * seasonalMultiplier * holidayMultiplier * weekendMultiplier * eventMultiplier;

      const inputTensor = tf.tensor2d(
        [
          [
            seasonalMultiplier,
            weekendMultiplier,
            competitorPrice,
            eventMultiplier,
            occupancyRate,
            localAttractionsPopularity,
          ],
        ],
        [1, 6]
      );

      const modelOutput = trainedModel.predict(inputTensor);
      const aiPriceTensor = await modelOutput.data();
      const aiPrice = aiPriceTensor[0];

      let finalPredictedPrice = (adjustedPrice + aiPrice) / 2;

      inputTensor.dispose();
      modelOutput.dispose();

      future.push({
        date: day,
        price: parseFloat(finalPredictedPrice.toFixed(2)),
      });
    }

    const smoothed = smoothPrices(future, 7);
    return smoothed;
  };

  const openModal = async (accommodation) => {
    setSelectedAccommodation(accommodation);

    if (!accommodation?.ID?.S) {
      console.error("No ID found in accommodation:", accommodation);
      return;
    }

    const storedRent =
      parseFloat(
        editedRates[accommodations.indexOf(accommodation)] ?? accommodation?.Rent?.N ?? accommodation?.Rent?.S
      ) || 100;

    setBasePrice(storedRent);

    const events = await fetchEventsInLocation(accommodation.Country?.S || "Unknown");

    const trainingData = generateTrainingDataForAccommodation(accommodation.ID.S, storedRent, 60);

    const trainedModel = await trainOrGetModel(accommodation.ID.S, trainingData);

    const future = await predictFuturePrices(
      trainedModel,
      storedRent,
      accommodation.Country?.S,
      accommodation.ID.S,
      events
    );

    setPriceHistory(future);

    const lastDayPrice = future[future.length - 1].price;
    setPredictedPrice(lastDayPrice);

    setDynamicPrice(storedRent);

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAccommodation(null);
  };

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
          backgroundColor: "rgba(52, 152, 219, 0.2)",
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
          tension: 0.3,
        },
      ],
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
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Price (€)",
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (tooltipItems) => {
            const item = tooltipItems[0];
            return item.label;
          },
          label: (tooltipItem) => {
            const price = tooltipItem.parsed.y;
            return `Price: €${price}`;
          },
        },
      },
    },
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

        <div className="host-pricing-container">
          {isLoading ? (
            <div>
              <img src={spinner} alt="Loading..." />
            </div>
          ) : viewMode === "details" ? (
            <div className="pricing-details-view">
              <div className="accommodation-cards">
                {currentAccommodations.map((accommodation, index) => {
                  const globalIndex = startIndex + index;
                  const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
                  const cleaningFeeIncluded = extraServices.some(
                    (service) => service.S === "Cleaning service (add service fee manually)"
                  );

                  return (
                    <div key={globalIndex} className="accommodation-card">
                      {accommodation.images?.length > 0 ? (
                        <img
                          src={`https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation.images[0].key}`}
                          alt="Geen afbeelding beschikbaar"
                          className="img-listed-dashboard"
                        />
                      ) : (
                        <img src={placeholderImage} alt="No image available" />
                      )}
                      <div className="accommodation-card-details">
                        <div className="pricing-column">
                          <p className="pricing-title">{accommodation.property.Title?.S}</p>
                          <p>Country: {accommodation.property.country}</p>
                        </div>

                        <div className="pricing-column">
                          <p className="pricing-rate-input">
                            {/* <button className="dynamic-pricing-button" onClick={() => openModal(accommodation)}>
                              <img src={dynamicPricing} alt="Dynamic Pricing" />
                            </button> */}
                            Rate:{" "}
                            {editMode ? (
                              <input
                                type="number"
                                step="0.1"
                                value={editedRates[globalIndex] || ""}
                                onChange={(e) => handleRateChange(e, globalIndex)}
                              />
                            ) : (
                              editedRates[globalIndex] || accommodation.Rent?.N || accommodation.Rent?.S
                            )}
                          </p>
                          <p className="pricing-rate-input">
                            Cleaning Fee:{" "}
                            {cleaningFeeIncluded ? (
                              editMode ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editedCleaningFees[globalIndex] || ""}
                                  onChange={(e) => handleCleaningFeeChange(e, globalIndex)}
                                />
                              ) : (
                                editedCleaningFees[globalIndex] ||
                                accommodation.CleaningFee?.N ||
                                accommodation.CleaningFee?.S
                              )
                            ) : (
                              0
                            )}
                          </p>
                          <p>Availability: {accommodation.Drafted?.BOOL ? "Unavailable" : "Available"}</p>
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
                    const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
                    const cleaningFeeIncluded = extraServices.some(
                      (service) => service.S === "Cleaning service (add service fee manually)"
                    );

                    return (
                      <tr key={globalIndex}>
                        <td className="pricing-table-title">{accommodation.Title?.S}</td>
                        <td>{accommodation.Country?.S}</td>
                        <td>{accommodation.GuestAmount?.N}</td>
                        <td>
                          {editMode ? (
                            <input
                              type="number"
                              step="0.1"
                              value={editedRates[globalIndex] || ""}
                              onChange={(e) => handleRateChange(e, globalIndex)}
                            />
                          ) : (
                            editedRates[globalIndex] || accommodation.Rent?.N || accommodation.Rent?.S
                          )}
                        </td>
                        <td>
                          {cleaningFeeIncluded ? (
                            editMode ? (
                              <input
                                type="number"
                                step="0.1"
                                value={editedCleaningFees[globalIndex] || ""}
                                onChange={(e) => handleCleaningFeeChange(e, globalIndex)}
                              />
                            ) : (
                              editedCleaningFees[globalIndex] ||
                              accommodation.CleaningFee?.N ||
                              accommodation.CleaningFee?.S
                            )
                          ) : (
                            0
                          )}
                        </td>
                        <td>{accommodation.Drafted?.BOOL ? "Unavailable" : "Available"}</td>
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
                  })}
                </tbody>
              </table>
            </div>
          )}

          {taxFeePopup &&
            selectedAccommodation &&
            handleTaxFeePopup(selectedAccommodation, accommodations.indexOf(selectedAccommodation))}

          {isModalOpen && selectedAccommodation && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>AI Dynamic Pricing</h2>

                <label>Base Price (€): </label>
                <input
                  disabled
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                />
                <div style={{ width: "100%", overflowX: "auto", margin: "20px auto" }}>
                  <div style={{ width: "3000px", height: "400px" }}>
                    <Line data={priceData} options={chartOptions} />
                    <CalendarPricingView priceHistory={priceHistory} onPriceChange={handleCalendarPriceChange} />
                  </div>
                </div>

                <button className="close-modal-button" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="pricing-bottom-buttons">
            <div className="pricing-navigation-buttons">
              <button
                className="pricing-prev-nav-button"
                onClick={() => pricingPannel(currentPannel > 1 ? currentPannel - 1 : 1)}
                disabled={currentPannel === 1}>
                Previous
              </button>
              {[...Array(endPage - startPage + 1)].map((_, index) => {
                const pageIndex = startPage + index;
                return (
                  <button
                    key={pageIndex}
                    className={`pricing-pagenumber-nav-button ${currentPannel === pageIndex ? "active" : ""}`}
                    onClick={() => pricingPannel(pageIndex)}>
                    {pageIndex}
                  </button>
                );
              })}
              <button
                className="pricing-next-nav-button"
                onClick={() =>
                  pricingPannel(
                    currentPannel < Math.ceil(accommodationsLength / activeItemsPerPage)
                      ? currentPannel + 1
                      : currentPannel
                  )
                }
                disabled={currentPannel === Math.ceil(accommodationsLength / activeItemsPerPage)}>
                Next
              </button>
            </div>

            <div className="pricing-action-buttons">
              <button onClick={handleEditMode}>Edit</button>
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
