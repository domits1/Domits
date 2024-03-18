import React from "react";
import Star from '../../images/icons/Star.svg'
import Heart from '../../images/icons/heart.svg'
import Map from '../../images/icons/map-02.svg'
import Amsterdam from '../../images/accoimg1.png';
import Chalet from '../../images/accom_chalet.png';
import Luxebamboovilla from '../../images/accom_luxebamboovilla.png';
import Luxevilla from '../../images/accom_luxevilla.png';
import Tinyhouse from '../../images/accom_tinyhouse_flowers.png';
import Treehouse from '../../images/accom_treehouse.png';
import Villaneth from '../../images/accom_villaneth.png';
import Yurt from '../../images/accom_yurt.png';
import Lighthouse from '../../images/orange_caravan.png';
import './Accommodations.css'

const lambdaEndpoint = 'https://xyunyodqwa4dxcryxxisqpeei40jjnwm.lambda-url.eu-north-1.on.aws/index';

console.log(lambdaEndpoint);

const Accommodations = ({ searchQuery }) => {
    const accolist = [
        {
            image: Amsterdam,
            address: 'Charming Apartment in Amsterdam',
            details: '2 beds 1 bathroom',
            size: '20m²',
            price: '€120/night',
            rating: '4,92',
            id: 1,
        },
        {
            image: Chalet,
            address: 'Typical dutch chalet in Soest',
            details: '6 beds 2 bathroom',
            size: '80m²',
            price: '€120/night',
            rating: '2,59',
            id: 2,
        },
        {
            image: Luxebamboovilla,
            address: 'A room in bamboo villa in Bali',
            details: '2 beds 1bathroom',
            size: '60m²',
            price: '€80/night',
            rating: '4,67',
            id: 3,
        },
        {
            image: Luxevilla,
            address: 'Luxe villa in Vinkeveen',
            details: '5 beds 2 bathroom',
            size: '120m²',
            price: '€160/night',
            rating: '4,23',
            id: 4,
        },
        {
            image: Tinyhouse,
            address: 'Tinyhouse Sint Maarten, Netherlands',
            details: '1 beds 1 bathroom',
            size: '20m²',
            price: '€40/night',
            rating: '3.97',
            id: 5,
        },
        {
            image: Treehouse,
            address: 'Luxury treehouse in Indonesia',
            details: '4 beds 1 bathroom',
            size: '50m²',
            price: '€160/night',
            rating: '2.97',
            id: 5,
        },
        {
            image: Villaneth,
            address: 'Luxe villa in Oestbeek',
            details: '4 beds 4 bathroom',
            size: '70m²',
            price: '€120/night',
            rating: '1.60',
            id: 6,
        },
        {
            image: Yurt,
            address: 'Blue yurt in Eersel',
            details: '2 beds 1 bathroom',
            size: '35m²',
            price: '€40/night',
            rating: '2.77',
            id: 7,
        },
        {
            image: Lighthouse,
            address: 'Lighthouse in the port of Cape Palos',
            details: '5 beds 2 bathroom',
            size: '110m²',
            price: '€110/night',
            rating: '4,98',
            id: 8,
        },
    ];

    const filteredAccommodations = accolist.filter(accommodation =>
        accommodation.address.toLowerCase().includes(searchQuery.toLowerCase())
    );



    return (
        <div id='card-visibility' >
            {filteredAccommodations.map((accommodation, index) => (
                
                <div className="accocard" key={index}>
                <img src={accommodation.image} alt="Product Image"></img>
                <div className="accocard-content">
                    <div className="accocard-title">{accommodation.address}</div>
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