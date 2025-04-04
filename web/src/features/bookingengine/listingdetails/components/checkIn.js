const CheckIn = ({checkInDate, setCheckInDate}) => {
    return (
        <div className="date-box">
            <p className="label">Check in</p>
            <div className="date">
                {checkInDate || "Select a date for check in"}
            </div>
        </div>
    )
}

export default CheckIn;