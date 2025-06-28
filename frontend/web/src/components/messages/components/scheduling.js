const Scheduling = () => (
    <div className="scheduling">
        <div className="schedule-row">
            <label>Booking Confirmation</label>
            <input type="range" min="0" max="8" step="1" />
            <span>Immediately</span>
        </div>
        <div className="schedule-row">
            <label>Check-in Instructions</label>
            <input type="range" min="0" max="8" step="1" />
            <span>1 hour</span>
        </div>
        <div className="schedule-row">
            <label>Check-out Instructions</label>
            <input type="range" min="0" max="8" step="1" />
            <span>1 hour</span>
        </div>
        <div className="reminders">
            <label>Reminders</label>
            <select>
                <option>Check-in time</option>
                <option>1 hour before</option>
                <option>2 hours before</option>
            </select>
            <button>+</button>
        </div>
    </div>
);

export default Scheduling;
