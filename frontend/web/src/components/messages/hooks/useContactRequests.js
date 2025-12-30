import { useState } from 'react';

const useContactRequests = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateContactRequest = async (contactId, status) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://ofegu64x64.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Update-ContactRequests',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Status: status,
            Id: contactId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contact request');
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update contact request';
      setError(errorMessage);
      console.error('Error updating contact request:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const acceptContact = async (contact) => {
    const result = await updateContactRequest(contact.ID || contact.id, 'accepted');
    if (result.success) {
      // Optionally trigger a success callback or notification
      console.log('Contact request accepted successfully');
    }
    return result;
  };

  const declineContact = async (contact) => {
    const result = await updateContactRequest(contact.ID || contact.id, 'rejected');
    if (result.success) {
      // Optionally trigger a success callback or notification
      console.log('Contact request declined successfully');
    }
    return result;
  };

  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    acceptContact,
    declineContact,
    updateContactRequest,
    clearError,
  };
};

export default useContactRequests;
