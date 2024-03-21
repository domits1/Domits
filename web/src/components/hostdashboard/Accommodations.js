import React, { useState, useEffect } from "react";
import accom_chalet from '../../images/accom_chalet.png';
import accoimg1 from '../../images/accoimg1.png';
import accom_luxebamboovilla from '../../images/accom_luxebamboovilla.png';
import accom_luxevilla from '../../images/accom_luxevilla.png';
import accom_tinyhouse_flowers from '../../images/accom_tinyhouse_flowers.png';
import accom_treehouse from '../../images/accom_treehouse.png';
import accom_villaneth from '../../images/accom_villaneth.png';
import accom_yurt from '../../images/accom_yurt.png';
import accommodationtestpic1 from '../../images/accommodationtestpic1.png';
import './Accommodations.css';

const Accommodations = ({ searchQuery }) => {
    const [accolist, setAccolist] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('https://xyunyodqwa4dxcryxxisqpeei40jjnwm.lambda-url.eu-north-1.on.aws/');
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const responseData = await response.json();
            // console.log(responseData);

            const img = [
                accom_chalet, accoimg1, accom_luxebamboovilla, accom_luxevilla, accom_tinyhouse_flowers, 
                accom_treehouse,accom_villaneth, accom_yurt, accommodationtestpic1
            ];
            const formattedData = responseData.map((item, index) => ({ // Use index of map to access img array
                // image: `https://amplify-domits-develop-123953-deployment.s3.eu-north-1.amazonaws.com/photos/${item.PhotoUrls}`,
                image: img[index % img.length],
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
