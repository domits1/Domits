import React from "react";
import accoImg from '../images/accommodationtestpic1.png';

const Accommodations = () => {
    const accolist = [
        {
            image: accoImg, 
            address: 'Kinderhuissingel 6K',
            details: '3 beds 1 bathroom',
            size: '20m²',
            price: '$720/night',
            id: 1,
        },
        {
            image: accoImg, 
            address: 'Huissingel 2A',
            details: '4 beds 4 bathroom',
            size: '60m²',
            price: '$120/night',
            id: 1,
        },
        {
            image: accoImg, 
            address: 'Singel 3F',
            details: '2 beds 3 bathroom',
            size: '40m²',
            price: '$20/night',
            id: 1,
        },
        {
            image: accoImg, 
            address: 'De Singel 1B',
            details: '1 beds 2 bathroom',
            size: '50m²',
            price: '$40/night',
            id: 1,
        },
    ];
    
    return ( 
        <div className="array">
            {accolist.map((accommodation, index) => (
                <div className="item-preview" key={index}>
                    <div className="imgacco"> 
                        <img src={accommodation.image} alt="Accommodation" /> 
                    </div>
                    <h2>{accommodation.address}</h2>
                    <p>{accommodation.details}</p>
                    <p>{accommodation.size}</p>
                    <p>{accommodation.price}</p>
                </div>
            ))}
        </div>
    );
}
 
export default Accommodations;