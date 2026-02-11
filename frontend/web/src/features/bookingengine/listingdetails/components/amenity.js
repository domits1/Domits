const Amenity = ({ amenity }) => {
    return (
        <div className="amenity">
            {amenity.icon}
            <span className="amenity-name">{amenity.amenity}</span>
        </div>
    );
};

export default Amenity;
