const Amenity = ({amenity}) => {
    return (
        <div className="essential-amenity-item">
            <div className="icon">{amenity.icon}</div>
            <p>{amenity.amenity}</p>
        </div>
    )
}

export default Amenity;