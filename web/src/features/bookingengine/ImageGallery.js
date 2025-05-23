import React, { useState } from 'react';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';



const ImageGallery = ({ images }) => {
    const [selectedImg, setSelectedImg] = useState(images[0]);
    const [liked, setLiked] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);

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

    const handleOverlayToggle = () => {
        setShowOverlay(!showOverlay);
    };

    const handleSelectedThumbnailClick = () => {
        if (window.innerWidth <= 600) {
            // If the screen width is less than or equal to 600px, toggle the overlay
            setShowOverlay(!showOverlay);
        }
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
                    onClick={handleSelectedThumbnailClick} // Add click handler
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
                {images.slice(0, 4).map((img, index) => (
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

            {/* Show all button */}
            {images.length > 4 && (
                <button className="show-all-button" onClick={handleOverlayToggle}>
                    Show All
                </button>
            )}

            {/* Overlay */}
            {showOverlay && (
                <div className="overlay">
                    <div className="overlay-content">
                        <button className="close-overlay-button" onClick={handleOverlayToggle}>
                            Close
                        </button>
                        <div className="overlay-images">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`Overlay Thumbnail ${index}`}
                                    onClick={() => setSelectedImg(img)}
                                    className="overlay-thumbnail"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;