import { useState, useEffect, useCallback } from 'react';
import { accommodationService } from '../services/accommodationService';

export const useAccommodations = () => {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editedRates, setEditedRates] = useState([]);
  const [originalRates, setOriginalRates] = useState([]);
  const [editedCleaningFees, setEditedCleaningFees] = useState([]);
  const [originalCleaningFees, setOriginalCleaningFees] = useState([]);

  const fetchAccommodations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = await accommodationService.getUserId();
      const data = await accommodationService.fetchAccommodations(userId);
      setAccommodations(data);
      
      // Initialize rates and cleaning fees
      const initialRates = data.map(acc => acc.Rent?.N || acc.Rent?.S || '');
      const initialCleaningFees = data.map(acc => acc.CleaningFee?.N || acc.CleaningFee?.S || '');
      setEditedRates(initialRates);
      setOriginalRates(initialRates);
      setEditedCleaningFees(initialCleaningFees);
      setOriginalCleaningFees(initialCleaningFees);
    } catch (err) {
      setError(err.message);
      console.error("Error in fetchAccommodations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRateChange = useCallback((index, value) => {
    setEditedRates(prev => {
      const newRates = [...prev];
      newRates[index] = value;
      return newRates;
    });
  }, []);

  const handleCleaningFeeChange = useCallback((index, value) => {
    setEditedCleaningFees(prev => {
      const newFees = [...prev];
      newFees[index] = value;
      return newFees;
    });
  }, []);

  const handleSaveRates = useCallback(async () => {
    try {
      const updatedAccommodations = accommodations.map((acc, i) => {
        const extraServices = acc.Features?.M?.ExtraServices?.L || [];
        const cleaningFeeIncluded = extraServices.some(
          service => service.S === 'Cleaning service (add service fee manually)'
        );

        if (editedRates[i] === undefined || editedRates[i] === '') {
          throw new Error(`Rent is missing or empty for accommodation: ${acc.Title?.S}`);
        }

        if (cleaningFeeIncluded && (editedCleaningFees[i] === undefined || editedCleaningFees[i] === '')) {
          throw new Error(`CleaningFee is missing or empty for accommodation: ${acc.Title?.S}`);
        }

        const rent = parseFloat(editedRates[i]);
        const cleaningFee = cleaningFeeIncluded ? parseFloat(editedCleaningFees[i]) : 0;

        if (rent < 0 || cleaningFee < 0) {
          throw new Error(
            `Negative value detected for accommodation: ${acc.Title?.S}. Rent: ${rent}, CleaningFee: ${cleaningFee}`
          );
        }

        return {
          AccommodationId: acc.ID.S,
          OwnerId: acc.OwnerId.S,
          Rent: Math.max(0, rent).toFixed(2),
          CleaningFee: Math.max(0, cleaningFee).toFixed(2),
          ServiceFee: Math.max(0, 0.15 * parseFloat(rent)).toFixed(2)
        };
      });

      const updatedData = await accommodationService.updateAccommodationRates(updatedAccommodations);
      
      const newRates = updatedData.map(acc => acc.Rent.N || acc.Rent.S || '');
      const newCleaningFees = updatedData.map(acc => acc.CleaningFee.N || acc.CleaningFee.S || '');
      
      setOriginalRates(newRates);
      setOriginalCleaningFees(newCleaningFees);
      
      return true;
    } catch (error) {
      console.error("Error in handleSaveRates:", error);
      throw error;
    }
  }, [accommodations, editedRates, editedCleaningFees]);

  const handleUndo = useCallback(() => {
    setEditedRates([...originalRates]);
    setEditedCleaningFees([...originalCleaningFees]);
  }, [originalRates, originalCleaningFees]);

  useEffect(() => {
    fetchAccommodations();
  }, [fetchAccommodations]);

  return {
    accommodations,
    isLoading,
    error,
    editedRates,
    editedCleaningFees,
    handleRateChange,
    handleCleaningFeeChange,
    handleSaveRates,
    handleUndo,
    fetchAccommodations
  };
}; 