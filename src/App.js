import './App.css';
import Header from "./components/Header";
// import Footer from "./components/Footer";
import Landing from "./components/Landing";
import Home from "./components/Home";
import Booking from "./components/Booking";
import About from "./components/About";
import Work from "./components/Work";
import Contact from "./components/Contact";
import Login from "./components/Login";
import HomeDashboard from "./components/AdminDashboard/HomeDashboard";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import React, { useState } from "react";
import Modal from "react-modal";
import HostDashboard from "./components/HostDashboard/HostDashboard";
import CreateAccommodation from "./components/HostDashboard/CreateAccommodation";
import ReadAccommodation from "./components/HostDashboard/ReadAccommodation";
import UpdateAccommodation from "./components/HostDashboard/UpdateAccommodation";
import DeleteAccommodation from "./components/HostDashboard/DeleteAccommodation";
import Footer from "./components/Footer";

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
                    <Route path="/admin" element={<HomeDashboard />} />
                    {/*host dashboard*/}
                    <Route path="/hostdashboard" element={<HostDashboard />} />
                    <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                    <Route path="/hostdashboard/read" element={<ReadAccommodation />} />
                    <Route path="/hostdashboard/update" element={<UpdateAccommodation />} />
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
