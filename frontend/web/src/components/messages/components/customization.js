const Customization = () => (
    <div className="customization">
        <div className="custom-msg">
            <h3>Booking Confirmation</h3>
            <textarea
                defaultValue={
                    `Hi [Guest Name]! 👋\n` +
                    `Thanks for your booking — it's confirmed! ✅\n` +
                    `You'll be staying with us from [Check-in Date] to [Check-out Date].\n` +
                    `We'll send check-in details closer to your arrival.\n\n` +
                    `Let me know if you have any questions in the meantime! 😊`
                }
            />
        </div>
        <div className="custom-msg">
            <h3>Check-in Instructions</h3>
            <textarea defaultValue={`Hi [Guest Name],\nCheck-in is from [Time]. Use code [Code] at the door.\nFull details sent via email. Let me know if you need help! 😊`} />
        </div>
        <div className="custom-msg">
            <h3>Check-out Instructions</h3>
            <textarea defaultValue={`Hi [Guest Name],\nCheck-out is at [Time]. Leave the key inside. Let me know if you need anything! 😊`} />
        </div>
    </div>
);

export default Customization;
