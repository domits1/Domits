import { useState, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

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
      price: parseFloat(avg.toFixed(2))
    });
  }
  return smoothed;
}

export const useDynamicPricing = () => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [basePrice, setBasePrice] = useState(0);
  const modelRefs = useRef({});

  const generateTrainingData = useCallback((accommodationId, basePrice, numDays = 60) => {
    let data = [];
    let startDate = new Date();

    const seed = accommodationId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

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

      let weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.2 : 1.25;
      let competitorPrice = basePrice + (rand1 - 0.5) * 60;
      let eventFactor = rand2 < 0.1 ? 1.2 : 1.0;
      let occupancyRate = 0.4 + rand3 * 0.6;
      let localAttractionsPopularity = 0.8 + rand4 * 0.4;

      let finalPrice =
        basePrice *
        seasonalFactor *
        weekendFactor *
        eventFactor *
        occupancyRate *
        localAttractionsPopularity *
        (0.5 + competitorPrice / (basePrice * 2)) *

      data.push({
        date: day,
        seasonalFactor,
        weekendFactor,
        competitorPrice,
        eventFactor,
        occupancyRate,
        localAttractionsPopularity,
        price: parseFloat(finalPrice.toFixed(2))
      });
    }
    return data;
  }, []);

  const trainOrGetModel = useCallback(async (accommodationId, trainingData) => {
    if (modelRefs.current[accommodationId]) {
      return modelRefs.current[accommodationId];
    }

    const newModel = tf.sequential();

    newModel.add(tf.layers.dense({ units: 16, inputShape: [6], activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 1 }));

    newModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    const xs = tf.tensor2d(
      trainingData.map(d => [
        d.seasonalFactor,
        d.weekendFactor,
        d.competitorPrice,
        d.eventFactor,
        d.occupancyRate,
        d.localAttractionsPopularity
      ])
    );
    const ys = tf.tensor2d(trainingData.map(d => [d.price]));

    await newModel.fit(xs, ys, { epochs: 80 });
    xs.dispose();
    ys.dispose();

    modelRefs.current[accommodationId] = newModel;
    return newModel;
  }, []);

  const predictFuturePrices = useCallback(async (
    trainedModel,
    basePrice,
    country,
    accommodationId,
    events = []
  ) => {
    let future = [];
    let today = new Date();

    const seasonalMultipliers = {
      "default": { summer: [1.1, 1.2], autumn: [0.9, 1.0], winter: [1.0, 1.1], spring: [1.0, 1.1] },
      "Zwitserland": { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Oostenrijk":  { winter: [1.2, 1.3], summer: [0.9, 1.0], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Australië":   { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Argentinië":  { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Brazilië":    { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Canada":      { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Chili":       { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "China":       { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Frankrijk":   { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Duitsland":   { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "India":       { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Italië":      { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Japan":       { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Mexico":      { summer: [0.8, 0.9], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Nederland":   { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Portugal":    { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Rusland":     { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Spanje":      { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] },
      "Zweden":      { summer: [1.0, 1.1], winter: [1.1, 1.2], autumn: [0.9, 1.0], spring: [1.0, 1.1] }
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
      "04-27": 1.2
    };

    const seed = accommodationId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

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

      let dateKey = `${month.toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
      let holidayMultiplier = holidayMultipliers[dateKey] || 1.0;

      let weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.05 + rand2 * 0.05 : 1.0;

      let eventMultiplier = 1.0;
      if (Array.isArray(events) && events.length > 0) {
        let eventToday = events.find(event => {
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
      let adjustedPrice =
        basePrice *
        seasonalMultiplier *
        holidayMultiplier *
        weekendMultiplier *
        eventMultiplier;

      const inputTensor = tf.tensor2d([[
        seasonalMultiplier,
        weekendMultiplier,
        competitorPrice,
        eventMultiplier,
        occupancyRate,
        localAttractionsPopularity
      ]], [1, 6]);

      const modelOutput = trainedModel.predict(inputTensor);
      const aiPriceTensor = await modelOutput.data();
      const aiPrice = aiPriceTensor[0];

      let finalPredictedPrice = (adjustedPrice + aiPrice) / 2;

      inputTensor.dispose();
      modelOutput.dispose();

      future.push({
        date: day,
        price: parseFloat(finalPredictedPrice.toFixed(2))
      });
    }

    return smoothPrices(future, 7);
  }, []);

  const initializeDynamicPricing = useCallback(async (accommodation) => {
    if (!accommodation?.ID?.S) {
      console.error("No ID found in accommodation:", accommodation);
      return;
    }

    const storedRent = parseFloat(
      accommodation?.Rent?.N ?? accommodation?.Rent?.S
    ) || 100;

    setBasePrice(storedRent);

    const trainingData = generateTrainingData(accommodation.ID.S, storedRent, 60);
    const trainedModel = await trainOrGetModel(accommodation.ID.S, trainingData);

    const future = await predictFuturePrices(
      trainedModel,
      storedRent,
      accommodation.Country?.S,
      accommodation.ID.S
    );

    setPriceHistory(future);
  }, [generateTrainingData, trainOrGetModel, predictFuturePrices]);

  const updateBasePrice = useCallback(async (newBasePrice, accommodation) => {
    setBasePrice(newBasePrice);
    await initializeDynamicPricing(accommodation);
  }, [initializeDynamicPricing]);

  return {
    priceHistory,
    basePrice,
    initializeDynamicPricing,
    updateBasePrice
  };
}; 