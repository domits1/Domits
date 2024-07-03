import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './house.css';
import banner from '../../../images/dutch_steamboat_small.png';
import camper1 from '../../../images/camper1placeholder.png';
import booking from '../../../images/camper-booking.png';
import camperIcon from '../../../images/icons/camper-van.png';
import verified from '../../../images/icons/verified.png';
import thumbsUp from '../../../images/icons/thumbs-up.png';
import reviewer from '../../../images/reviewer.png';
import stars from '../../../images/icons/review-stars.png';

const House = () => {
    const navigateToHost = () => {

    };

    const navigateToBooking = () => {

    };

    return(
        <div className='camper-container'>
            <img className="banner" src={banner}/>
            <div className='camper-header-container'>
                <div className='camper-header-content'>
                  <div className='camper-header-text'>
                    <h1 className='h1-first'>Welcome to your</h1>
                    <h1 className='h1-second'>home away from home</h1>
                  </div>
                  <div className='home-header-button'>
                    <button type='text' className='host-button' onClick={() => navigateToHost}>Host your own house</button>
                  </div>
                </div>
            </div>

            <div className='discover-container'>
                <h1 className='discover-header'>Discover Houses on Domits</h1>
                <div className='discover-text'>
                    <p>Domits offers a range of houses with a story and a unique way of handling it.</p>
                    <p><img src={camperIcon} alt='House icon' width={25}/>Choose from a variety of campers to suit every need and budget.</p>
                </div>
                <div className='discover-images'>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                    <div className='discover-images1'>
                        <img src={camper1} alt='House' width={360} />
                        <h3>$100</h3>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                    </div>
                </div>
            </div>

            <div className='review-container'>
                <h1 className='review-header'>Most booked house in January 2024</h1>
                <div className='review-text'>
                    <p><img src={verified} width={25} alt='verified icon'/>All hosts are verified and trusted for a safe experience</p>
                    <p><img src={thumbsUp} width={25} alt='thumbs-up icon'/>Read real reviews and ratings from fellow travelers.</p>
                </div>
                <div className='review-booking-test'>
                    <div className='booking'>
                      <div className='booking-image'>
                        <img src={booking} alt='camper' width={550} />
                        <p>$80</p>
                        <p>4 beds   - 1 bathroom   - 60m2</p>
                        <button type='text' className='booking-button' onClick={() => navigateToBooking}>Book</button>
                      </div>
                    </div>
                    <div className='booking-review'>
                      <div className='reviewer-header'>
                        <img src={reviewer} alt='camper' width={90} />
                        <h3>Aura</h3>
                        <img src={stars} alt='stars' />
                      </div>
                      <div className='reviewer-content'>
                        <p style={{fontSize: 22}}>Aura:</p>
                        <p>“A house at the beach is just amazing, it feels like you own the beach, the sun and the water. Waking up with the sounds of the waves and ending your day with a sunset is just perfection in all ways!”</p>
                        <p className="day">18 hours ago</p>
                      </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default House;