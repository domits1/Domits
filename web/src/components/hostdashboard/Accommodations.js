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
import house1 from '../../images/house1.jpeg';
import house2 from '../../images/house2.jpeg';
import house3 from '../../images/house3.jpeg';
import house4 from '../../images/house4.jpeg';
import house5 from '../../images/house5.jpeg';
import house6 from '../../images/house6.jpeg';
import house7 from '../../images/house7.jpeg';
import school8 from '../../images/school8.jpeg';
import house9 from '../../images/house9.jpeg';
import house10 from '../../images/house10.jpeg';
import house11 from '../../images/house11.jpeg';
import house12 from '../../images/house12.jpeg';
import house13 from '../../images/house13.jpeg';
import house14 from '../../images/house14.jpeg';
import house15 from '../../images/house15.jpeg';
import house16 from '../../images/house16.jpeg';
import house17 from '../../images/house17.jpeg';
import house18 from '../../images/house18.jpeg';
import house19 from '../../images/house19.jpeg';
import house20 from '../../images/house20.jpeg';
import house21 from '../../images/house21.jpeg';
import house22 from '../../images/house22.jpeg';
import house23 from '../../images/house23.jpeg';
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
                accom_treehouse,accom_villaneth, accom_yurt, accommodationtestpic1, house1, house2, house3,
                house4, house5, house6, house7, school8, house9, house10, house11, house12, house13, house14,
                house15, house16, house17, house18, house19, house20, house21, house22, house23
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
