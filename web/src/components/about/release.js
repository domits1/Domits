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
      details: "🌐 Our website is live with a clean and intuitive interface. \n🏠 A comprehensive overview of accommodations is now available. Browse, explore, and start dreaming about your next getaway.",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.1 - V 22.02.2024",
      details: "🎉 Host and Guest Dashboards: We've launched personalized dashboards for both hosts and guests, making managing listings and planning vacations smoother than ever. \n💹 Revenue Tool: Unlock the potential of your property with our new revenue tool, designed to optimize your earnings. \n🔍 Enhanced Filter Functions: Finding the perfect accommodation is easier with our improved search filters. \n🌟 Travel Innovation Lab: Explore the future of travel with our Travel Innovation Lab, where we're developing cutting-edge solutions for tomorrow's travel needs. \n🔐 Fully Working Login/Register: A streamlined login and registration process ensures you can access our platform effortlessly.",
      image: note2,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.2 - V 22.03.2024",
      details: "📱 Domits App: The much-anticipated Domits app, as announced in our previous update, is about to launch! Featuring functionalities such as profile dashboards for Travellers and Hosts, an advanced booking process, and a homepage showcasing a wide range of accommodations with handy filters, we're bringing the full functionality of Domits.com to your mobile device. Designed for both iOS and Android, the app is crafted to make your experience seamless and accessible, wherever you are.💼 Profile Dashboards: Manage your listings or plan your vacations effortlessly through the new, personalized dashboards for hosts and travellers within the app. \n📊 Revenue Tool: Maximize your earnings with our integrated revenue tool, now available in the app. \n🚀 Onboarding for Hosts: The onboarding process for new hosts is streamlined and ready for the first wave of real hosts.",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.3 - V 22.04.2024",
      details: "🌐 Website Enhancement: We’re delighted to announce that our website is nearing completion, with significant improvements made to ensure a seamless user experience. While the backend is robust and fully functional, we’re currently fine-tuning the frontend to elevate your browsing experience further. \n📱 App Development Progress: The much-awaited Domits app is progressing steadily. Our development team is hard at work to ensure that every feature translates flawlessly to the mobile platform. From intuitive navigation to responsive design, we’re committed to delivering an app that simplifies vacation rental management and booking on the go.",
      image: note2,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.4 - V 22.05.2024",
      details: " 📲 Fully Functional Chat: Introducing our brand-new chat feature! Engage with hosts and travelers seamlessly, ask questions, and receive instant responses to make your booking experience even smoother. \n🔃 Revamped Enrollment Process: Say hello to our refreshed enrollment process! We’ve streamlined the steps to ensure a hassle-free registration experience for both hosts and guests. \n📅  Date-Specific Listing: Now, hosts can list their accommodations for specific dates, providing more flexibility and precision in managing their rental availability. Guests can also book their stays according to their preferred dates, enhancing the booking process.",
      image: note1,
      isOpen: false
    },
    {
      releaseNote: "Release 1.0.5 - V 22.06.2024",
      details: "coming soon...",
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
      <div className="release__header-container">
        <div className="release__header">
          <h1 className="release__title">What’s New</h1>
          <h4 className="release__subtitle">Innovative Vacation Rentals.</h4>
          <h4 className="release__subtitle">Redesigned for You.</h4>
          <button className="release__button" type="button" onClick={() => navigate('/releaseTwo')}>Read More</button>
        </div>
        <img className="release__image-header" src={release} alt="Release" width={300} />
      </div>

      <div className="release__notes">
        {releaseNotes.map((note, index) => (
          <div className={`release__item ${note.isOpen ? 'release__item--expanded' : ''}`} onClick={() => toggleOpen(index)} key={index}>
            <img className="release__item-image" src={note.image} alt={note.releaseNote} />
            <h4 className="release__item-title">{note.releaseNote}</h4>
            <div className="release__details">
            {note.details.split('\n').map((line, index) => (
              <p className="release__item-text" key={index}>{line}</p>
            ))}
            </div>
          </div>
        ))}
      </div>
    </div>
);

};

export default Release;
