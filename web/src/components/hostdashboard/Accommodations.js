import React, { useState, useEffect } from "react";
import './Accommodations.css';

const Accommodations = ({ searchQuery }) => {
    const [accolist, setAccolist] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('https://cfeo8gr5y0.execute-api.eu-north-1.amazonaws.com/dev/accommodation');
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const responseData = await response.json();
            // console.log(responseData);
    
            const formattedData = responseData.map((item, index) => ({ // Use index of map to access img array
                image: `https://accommodationphotos.s3.eu-north-1.amazonaws.com/${item.PhotoUrls}`,
                // image: img[index % img.length],
                title: item.Title,
                details: item.description,
                size: `${item.Size}m²`,
                price: `€${item.Price}/night`,
                id: item['#PK'],
            }));
            setAccolist(formattedData);
            // console.log("Image URLs:", formattedData.map(item => item.image));
        } catch (error) {
            console.error('Error fetching or processing data:', error);
        }
    };
    

    const filteredAccommodations = accolist.filter(accommodation =>
        accommodation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // console.log("Filtered accommodations:", filteredAccommodations);

    return (
        <div id='card-visibility'>
            {filteredAccommodations.map((accommodation, index) => (
                <div className="accocard" key={index}>
                    <img src={accommodation.image} alt="Product Image" />
                    <div className="accocard-content">
                        <div className="accocard-title">{accommodation.title}</div>
                        <div className="accocard-price">{accommodation.price}</div>
                        <div className="accocard-detail">{accommodation.details}</div>
                        <div className="accocard-size">{accommodation.size}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Accommodations;
