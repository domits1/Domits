import { useNavigate } from "react-router-dom";

function useHandleReservePress() {
    const navigate = useNavigate();

    return (id, checkInDate, checkOutDate, guests) => {
        const details = {
            id,
            checkInDate,
            checkOutDate,
            guests
        };
        const queryString = new URLSearchParams(details).toString();
        navigate(`/bookingoverview?${queryString}`);
    };
}

export default useHandleReservePress;
