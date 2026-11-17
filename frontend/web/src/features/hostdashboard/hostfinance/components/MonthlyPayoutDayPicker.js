const MONTHLY_PAYOUT_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export default function MonthlyPayoutDayPicker({ value, onChange, disabled = false }) {
  const selectedDay = Number(value);

  return (
    <fieldset className="finance-monthly-day-picker" disabled={disabled} aria-describedby="finance-monthly-day-help">
      <legend>Choose a day of the month</legend>
      <div className="finance-monthly-day-grid">
        {MONTHLY_PAYOUT_DAYS.map((day) => (
          <label className="finance-monthly-day-option" key={day}>
            <input
              type="radio"
              name="finance-monthly-payout-day"
              value={day}
              checked={selectedDay === day}
              onChange={() => onChange(day)}
            />
            <span>{day}</span>
          </label>
        ))}
      </div>
      <p className="finance-monthly-day-help" id="finance-monthly-day-help">
        For payout days 29–31, Stripe uses the last day of shorter months.
      </p>
      {value != null && (
        <p className="finance-monthly-day-selection" aria-live="polite">
          Payouts are scheduled on day {selectedDay} of every month.
        </p>
      )}
    </fieldset>
  );
}
