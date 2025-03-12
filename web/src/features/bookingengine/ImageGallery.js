import React, { useState } from 'react';
import './imagegallery.css';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';

const ImageGallery = ({ images }) => {
    // Slice the first 5 images if available
    const limitedImages = images.slice(0, 4);
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
            {/* Selected image */}
            <div className="selected-image">
            <img
            className="selected-thumbnail"
            src={selectedImg}
            srcSet={`${selectedImg}?w=800 800w, ${selectedImg}?w=1200 1200w, ${selectedImg}?w=1600 1600w`}
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
            alt="Selected"
            loading="lazy"
            />
                <button className="share-button" onClick={handleShare}>
                    <IosShareIcon />
                </button>
                <button className="like-button" onClick={() => setLiked(!liked)}>
                    {liked ? (
                        <FavoriteIcon sx={{ color: '#ec5050' }} />
                    ) : (
                        <FavoriteBorderOutlinedIcon />
                    )}
                </button>
            </div>

            {/* Image thumbnails */}
            <div className="image-thumbnails">
                {limitedImages.map((img, index) => (
                    <img
                        key={index}
                        src={img}
                        srcSet={`${img}?w=100 100w, ${img}?w=200 200w`}
                        sizes="100px"
                        alt={`Thumbnail ${index}`}
                        onClick={() => setSelectedImg(img)}
                        className={img === selectedImg ? 'active' : ''}
                        loading="lazy"
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageGallery;
