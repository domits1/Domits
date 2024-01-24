import React from "react";
import Star from '../../images/icons/Star.svg'
import Map from '../../images/icons/map-02.svg'
import accoImg from '../../images/accoimg1.png';
import './Accommodations.css'

const Accommodations = ({ searchQuery }) => {
    const accolist = [
        {
            image: accoImg, 
            address: 'Amber Avenue 6K',
            details: '3 beds 1 bathroom',
            size: '20m²',
            price: '$720/night',
            id: 1,
        },
        {
            image: accoImg, 
            address: 'Birch Boulevard 2',
            details: '4 beds 4 bathroom',
            size: '60m²',
            price: '$120/night',
            id: 2,
        },
        {
            image: accoImg, 
            address: 'Cedar Court 3F',
            details: '2 beds 3 bathroom',
            size: '40m²',
            price: '$20/night',
            id: 3,
        },
        {
            image: accoImg, 
            address: 'Dahlia Drive 1B',
            details: '1 beds 2 bathroom',
            size: '50m²',
            price: '$40/night',
            id: 4,
        },
        {
            image: accoImg, 
            address: 'Elm Street 6K',
            details: '3 beds 1 bathroom',
            size: '20m²',
            price: '$720/night',
            id: 5,
        },
        {
            image: accoImg, 
            address: 'Fern Avenue 2A',
            details: '4 beds 4 bathroom',
            size: '60m²',
            price: '$120/night',
            id: 6,
        },
        {
            image: accoImg, 
            address: 'Grove Green 3F',
            details: '2 beds 3 bathroom',
            size: '40m²',
            price: '$20/night',
            id: 7,
        },
        {
            image: accoImg, 
            address: 'Hazel Hill 1B',
            details: '1 beds 2 bathroom',
            size: '50m²',
            price: '$40/night',
            id: 8,
        },
    ];

    const filteredAccommodations = accolist.filter(accommodation =>
        accommodation.address.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="array">
            {filteredAccommodations.map((accommodation, index) => (
                <div className="item-preview" key={index}>
                    <div className="overlay">
                    <span className='star'>
                        <img src={Star} alt="Star" />
                        4.97
                    </span>
                    {/*    <span className='map'>*/}
                    {/*    <img src={Map} alt="Map" />*/}
                    {/*</span>*/}

                    </div>
                    <div className="imgacco">
                        <img src={accommodation.image} alt="Accommodation" />
                    </div>
                    <h2>{accommodation.address}</h2>
                    <p>{accommodation.price}</p>
                    <p>{accommodation.details}</p>
                    <p>{accommodation.size}</p>
                </div>
            ))}
        </div>
    );

}
 
export default Accommodations;