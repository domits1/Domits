import React, { useRef, useEffect } from 'react';
import "./listingdetails.css";
import arrow from "../../images/arrow.svg"
import goated from "../../images/goated.jpg"
import bookarrow from "../../images/whitearrow.png"
import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import detailimg2 from '../../images/accoimg2.png';

const DetailCard = () => {
    const detailCardRef = useRef(null);
    const footerRef = useRef(null);
  
    useEffect(() => {
      const handleScroll = () => {
        const detailCard = detailCardRef.current;
        const footer = footerRef.current;
        
        if (detailCard && footer) {
          const windowHeight = window.innerHeight;
          const detailCardHeight = detailCard.getBoundingClientRect().height;
          const footerTop = footer.getBoundingClientRect().top;
          
          if (windowHeight - footerTop > detailCardHeight) {
            detailCard.style.position = 'fixed';
            detailCard.style.bottom = `${windowHeight - footerTop}px`;
          } else {
            detailCard.style.position = 'relative';
            detailCard.style.bottom = 'auto';
          }
        }
      };
  
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div ref={detailCardRef}>
        
        </div>
    );
}

export default DetailCard;
