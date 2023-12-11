import React from "react";
import accoImg from '../images/accommodationtestpic1.png';

const Accommodations = () => {
    const accolist = [
        {
            image: accoImg, 
            address: 'Kinderhuissingel 6K',
            details: '4 beds 1 bathroom',
            size: '60m2',
            price: '$120/night',
            id: 1
        }
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