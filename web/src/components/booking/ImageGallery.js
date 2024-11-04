import React, { useState } from 'react';
import './imagegallery.css';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';

const ImageGallery = ({ images }) => {
    const limitedImages = images.slice(0, 5);
    const [selectedImg, setSelectedImg] = useState(limitedImages[0]);
    const [liked, setLiked] = useState(false);

    const handleShare = () => {
        navigator.clipboard
            .writeText(window.location.href)
            .then(() => {
                alert('URL is copied to clipboard!');
            })
            .catch((error) => {
                console.error('Could not copy the URL:', error);
            });
    };

    return (
        <div className="image-gallery-container">
            <div className="selected-image">
                <img className="selected-thumbnail" src={selectedImg} alt="Selected" />
                <button className="share-button" onClick={handleShare}>
                    <IosShareIcon />
                </button>
                <button className="like-button" onClick={() => setLiked(!liked)}>
                    {liked ? <FavoriteIcon sx={{ color: '#ec5050' }} /> : <FavoriteBorderOutlinedIcon  />}
                </button>
            </div>
            <div className="image-thumbnails">
                {limitedImages.map((img, index) => (
                    <img
                        key={index}
                        src={img}
                        alt={`Thumbnail ${index}`}
                        onClick={() => setSelectedImg(img)}
                        className={img === selectedImg ? 'active' : ''}
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageGallery;
