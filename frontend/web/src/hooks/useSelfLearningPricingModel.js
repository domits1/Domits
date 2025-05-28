import * as tf from '@tensorflow/tfjs';
import { useEffect, useState } from 'react';

const useSelfLearningPricingModel = (historicalData, userAdjustments, setDynamicPrice, setPriceHistory, bookingData) => {
  const [model, setModel] = useState(null);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    if (historicalData.length > 0) {
      trainModel(historicalData, userAdjustments, bookingData);
    }
  }, [historicalData, userAdjustments, bookingData]);

  const trainModel = async (data, adjustments, bookings) => {
    setIsTraining(true);
    if (model) model.dispose();

    newModel.add(tf.layers.dense({ units: 16, inputShape: [5], activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 1 }));

    newModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    const trainingData = prepareTrainingData(data, adjustments, bookings);
    const xs = tf.tensor2d(trainingData.map(d => [
      d.seasonalEffect, d.occupancyRate, d.competitorPrice, d.specialEventFactor, d.bookingRate
    ]));
    const ys = tf.tensor2d(trainingData.map(d => [d.price]));

    await newModel.fit(xs, ys, { epochs: 80 });
    setModel(newModel);
    setIsTraining(false);
  };

  const prepareTrainingData = (data, adjustments, bookings) => {
    return data.map((entry, index) => {
      let userAdjustedPrice = adjustments[index]?.price ?? entry.price;
      let bookingRate = bookings[index]?.conversionRate ?? 0.5;
      return { ...entry, price: userAdjustedPrice, bookingRate };
    });
  };

  const predictPrice = async (input) => {
    if (!model) return null;
    const inputTensor = tf.tensor2d([input]);
    const prediction = model.predict(inputTensor);
    const price = (await prediction.data())[0];
    setDynamicPrice(parseFloat(price.toFixed(2)));
    updatePriceHistory(price);
    return parseFloat(price.toFixed(2));
  };

  const updatePriceHistory = (newPrice) => {
    setPriceHistory(prevHistory => [
      ...prevHistory,
      { date: new Date().toISOString(), price: newPrice }
    ]);
  };

  const integrateWithUI = (accommodation, setBasePrice, setPredictedPrice, setIsModalOpen) => {
    setBasePrice(accommodation.Rent ? parseFloat(accommodation.Rent) : 100);
    predictPrice([
      1.1,
      0.8,
      120,
      1.2,
      0.6,
      1.5,
      0.7,
      0.9
    ]).then(predictedPrice => {
      setPredictedPrice(predictedPrice);
      setIsModalOpen(true);
    });
  };

  return { model, trainModel, predictPrice, isTraining, integrateWithUI };
};

export default useSelfLearningPricingModel;
