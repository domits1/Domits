import './App.css';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Landing from "./components/Landing";
import Home from "./components/Home";
import Booking from "./components/Booking";
import About from "./components/About";
import Work from "./components/Work";
import Contact from "./components/Contact";
import Login from "./components/Login";
import Details from './components/Details';
import HomeDashboard from "./components/AdminDashboard/HomeDashboard";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import React, { useState } from "react";
import Modal from "react-modal";
import HostDashboard from "./components/hostdashboard/HostDashboard";
import CreateAccommodation from "./components/hostdashboard/CreateAccommodation";
import ReadAccommodation from "./components/hostdashboard/ReadAccommodation";
import UpdateAccommodation from "./components/hostdashboard/UpdateAccommodation";
import DeleteAccommodation from "./components/hostdashboard/DeleteAccommodation";
import GuestDashboard from './components/guestDashboard/GuestDashboard';

function App() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    // Conditionally render the Header based on the current route
    const renderHeader = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin') {
            return null; // Don't render Header for /admin route
        }
        return <Header openLoginModal={openLoginModal} />;
    };

    const renderFooter = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin') {
            return null; // Don't render Header for /admin route
        }
        return <Footer/>;
    };

    return (
        <Router>
            <div className="App">
                {renderHeader()}
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/work" element={<Work />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/details" element={<Details/>} />
                    <Route path="/admin" element={<HomeDashboard />} />
                    <Route path="/guestdashboard" element={<GuestDashboard />}/>
                    {/*host dashboard*/}
                    <Route path="/hostdashboard" element={<HostDashboard />} />
                    <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                    <Route path="/hostdashboard/Read" element={<ReadAccommodation />} />
                    <Route path="/hostdashboard/Update" element={<UpdateAccommodation />} />
                    <Route path="/hostdashboard/delete" element={<DeleteAccommodation />} />
                </Routes>
            </div>
            {renderFooter()}

            {/* Login Modal */}
            <Modal
                isOpen={isLoginModalOpen}
                onRequestClose={closeLoginModal}
                contentLabel="Login Modal"
            >
                {/* Render the Login component inside the modal */}
                <Login />
                <button className="close-button" onClick={closeLoginModal} >Close Modal</button>
            </Modal>
        </Router>
    );
}

export default App;
