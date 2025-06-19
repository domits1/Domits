const Preview = () => (
    <div className="preview">
        <div className="preview-header">
            <label>Select event:</label>
            <select>
                <option>Booking confirmation</option>
                <option>Check-in Instructions</option>
            </select>
        </div>
        <div className="preview-chat">
            <div className="bubble">
                <p>
                    Hi [Guest Name]! 👋<br />
                    Thanks for your booking — it's confirmed! ✅<br />
                    You'll be staying with us from [Check-in Date] to [Check-out Date].<br />
                    We'll send check-in details closer to your arrival.<br /><br />
                    Let me know if you have any questions in the meantime! 😊
                </p>
            </div>
        </div>
    </div>
);

export default Preview;
