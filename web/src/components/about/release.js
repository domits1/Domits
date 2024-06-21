import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './release.css';
import release from '../../images/release.png';
import note1 from '../../images/house.jpeg';
import note2 from '../../images/phone1.webp';

const Release = () => {
  const navigate = useNavigate();
  const initialReleaseNotes = [
    {
      releaseNote: "Release 1.0.0 - V 22.01.2024",
      details: "Details about release 1.0.0",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.1 - V 22.02.2024",
      details: "Details about release 1.0.1",
      image: note2,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.2 - V 22.03.2024",
      details: "Details about release 1.0.2",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.3 - V 22.04.2024",
      details: "Details about release 1.0.3",
      image: note2,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.4 - V 22.05.2024",
      details: "Details about release 1.0.4",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.5 - V 22.06.2024",
      details: "Details about release 1.0.5",
      image: note2,
      isOpen: false
    }
  ];

  const [releaseNotes, setReleaseNotes] = useState(initialReleaseNotes);

  const toggleOpen = (index) => {
    setReleaseNotes((currentReleaseNotes) =>
      currentReleaseNotes.map((note, i) =>
        i === index ? { ...note, isOpen: !note.isOpen } : note
      )
    );
  };

  return (
    <div className="release">
      <div className="release-header-container">
        <div className="release-header">
          <h1>What’s New</h1>
          <h4>Innovative Vacation Rentals.</h4>
          <h4>Redesigned for You.</h4>
          <button type="button" onClick={() => navigate('/releaseTwo')}>Read More</button>
        </div>
        <img className="image-header" src={release} alt="Release" width={300} />
      </div>

      <div className="release-notes">
        {releaseNotes.map((note, index) => (
          <div className={`release-item ${note.isOpen ? 'expanded' : ''}`} onClick={() => toggleOpen(index)} key={index}>
            <img src={note.image} alt={note.releaseNote} />
            <h4>{note.releaseNote}</h4>
            <div className="release-details">
              <p>{note.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Release;
