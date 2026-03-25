import React, { useState } from "react";
import IosShareIcon from "@mui/icons-material/IosShare";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShareModal from "./components/ShareModal";

const ImageGallery = ({ images }) => {
  const [selectedImg, setSelectedImg] = useState(images[0]);
  const [liked, setLiked] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleOverlayToggle = () => {
    setShowOverlay(!showOverlay);
  };

  const handleSelectedThumbnailClick = () => {
    if (window.innerWidth <= 600) {
      setShowOverlay(!showOverlay);
    }
  };

  return (
    <div className="image-gallery-container">
      <div className="selected-image">
        <img
          className="selected-thumbnail"
          src={selectedImg}
          srcSet={`${selectedImg}?w=800 800w, ${selectedImg}?w=1200 1200w, ${selectedImg}?w=1600 1600w`}
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt="Selected"
          loading="lazy"
          onClick={handleSelectedThumbnailClick}
        />
        <button className="share-button" onClick={handleShare}>
          <IosShareIcon />
        </button>
        <button className="like-button" onClick={() => setLiked(!liked)}>
          {liked ? <FavoriteIcon sx={{ color: "#ec5050" }} /> : <FavoriteBorderOutlinedIcon />}
        </button>
      </div>

      <div className="image-thumbnails">
        {images.slice(0, 4).map((img, index) => (
          <img
            key={index}
            src={img}
            srcSet={`${img}?w=100 100w, ${img}?w=200 200w`}
            sizes="100px"
            alt={`Thumbnail ${index}`}
            onClick={() => setSelectedImg(img)}
            className={img === selectedImg ? "active" : ""}
            loading="lazy"
          />
        ))}
      </div>

      {images.length > 4 && (
        <button className="show-all-button" onClick={handleOverlayToggle}>
          Show All
        </button>
      )}

      {showShareModal && (
        <ShareModal url={globalThis.location.href} onClose={() => setShowShareModal(false)} />
      )}

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
