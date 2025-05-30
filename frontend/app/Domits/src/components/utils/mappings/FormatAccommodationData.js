const FormatAccommodationData = items => {
    return items.map(item => ({
        image: item.Images.image1,
        title: item.Title,
        city: item.City,
        country: item.Country,
        details: item.Description,
        size: item.Measurements,
        price: Number(item.Rent).toFixed(2),
        id: item.ID,
        bathrooms: item.Bathrooms,
        bedrooms: item.Bedrooms,
        beds: item.Beds,
        guests: item.GuestAmount,
    }));
};

export default FormatAccommodationData;