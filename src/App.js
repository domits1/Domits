import './App.css';
import Header from "./components/base/Header";
import Landing from "./components/landingpage/Landing";
import Assortment from './components/Assortment';
import Home from "./components/home/Home";
import Booking from "./components/booking/Booking";
import About from "./components/about/About";
import Careers from "./components/careers/Careers";
import Contact from "./components/contact/Contact";
import Login from "./components/Login";
import HostDashboard from "./components/hostdashboard/HostDashboard";
import Details from './components/details/Details';
import HomeDashboard from "./components/admindashboard/HomeDashboard";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import React, {useEffect, useState} from "react";
import Modal from "react-modal";
import CreateAccommodation from "./components/hostdashboard/CreateAccommodation";
import ReadAccommodation from "./components/hostdashboard/ReadAccommodation";
import UpdateAccommodation from "./components/hostdashboard/UpdateAccommodation";
import DeleteAccommodation from "./components/hostdashboard/DeleteAccommodation";
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import Footer from "./components/base/Footer";
import {ProtectedRoute} from "./components/protectedroute/ProtectedRoute.tsx";
import Disclaimers from "./components/disclaimers/Disclaimers";
import Policy from "./components/disclaimers/Policy";
import Terms from "./components/disclaimers/Terms";

function App() {
    useEffect(() => {
        return () => {
            document.title = 'Domits';
        };
    }, []);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    // Conditionally render the Header based on the current route
    const renderHeader = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin' || currentPath === '/') {
            return null;
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
                    <Route path="/" element={<Assortment />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/career" element={<Careers />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/details" element={<Details/>} />
                    <Route path="/assortment" element={<Assortment />} />
                    <Route path="/Guestdashboard" element={<GuestDashboard />}/>
                    <Route path="/career" element={<Careers />} />
                    <Route path="/hostdashboard" element={<HostDashboard />} />
                    <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                    <Route path="/hostdashboard/read" element={<ReadAccommodation />} />
                    <Route path="/hostdashboard/update" element={<UpdateAccommodation />} />
                    <Route path="/hostdashboard/delete" element={<DeleteAccommodation />} />
                    <Route path="/disclaimers" element={<Disclaimers />} />
                    <Route path="/policy" element={<Policy />} />
                    <Route path="/terms" element={<Terms />} />


                    {/*  Admin Routes  */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={["Admin"]} page={<HomeDashboard/>} redirectTo='/' />} />
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
