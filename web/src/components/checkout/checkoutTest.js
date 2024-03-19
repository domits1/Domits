import React, { useState, useEffect } from 'react';
import axios from 'axios';

function checkoutTest() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await axios.get('https://kcmfezurd1.execute-api.eu-north-1.amazonaws.com/dev');
                console.log('Response:', response.data); // Log the response to see its structure
                setPayments(response.data.body.Items);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching payments:', error);
                setError(error.message || 'An error occurred');
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <div>
            <h1>Payments</h1>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>Error: {error}</p>
            ) : (
                <ul>
                    {payments.map(payment => (
                        <li key={payment.id}>
                            <strong>ID:</strong> {payment.id}<br />
                            <strong>Amount:</strong> {payment.amount}<br />
                            <strong>Cancel URL:</strong> {payment.cancelUrl}<br />
                            <strong>Currency:</strong> {payment.currency}<br />
                            <strong>Product Name:</strong> {payment.productName}<br />
                            <strong>Success URL:</strong> {payment.successUrl}<br />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default checkoutTest;
