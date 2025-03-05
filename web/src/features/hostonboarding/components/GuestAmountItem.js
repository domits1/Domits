import React from 'react';

function GuestAmountItem({ label, value, increment, decrement, max }) {
    return (
        <div className="guest-amount-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ marginRight: '20px' }}>{label}</p>
            <div className="amount-btn-box" style={{ display: 'flex', alignItems: 'center' }}>
                <button className="round-button" onClick={decrement} disabled={value <= 0} style={{ marginRight: '10px' }}>
                    -
                </button>
                <span style={{ margin: '0 10px' }}>{value}</span>
                <button className="round-button" onClick={increment} disabled={value >= max}>
                    +
                </button>
            </div>
        </div>
    );
}

export default GuestAmountItem;