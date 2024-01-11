import './App.css';
import Header from "./components/Header";
import Landing from "./components/Landing";
import Assortment from './components/Assortment';
import Home from "./components/Home";
import Booking from "./components/Booking";
import About from "./components/About";
import Work from "./components/Work";
import Contact from "./components/Contact";
import Login from "./components/Login";
import HostDashboard from "./components/hostdashboard/HostDashboard";
import Details from './components/Details';
import HomeDashboard from "./components/admindashboard/HomeDashboard";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import React, {useEffect, useState} from "react";
import Modal from "react-modal";
import CreateAccommodation from "./components/hostdashboard/CreateAccommodation";
import ReadAccommodation from "./components/hostdashboard/ReadAccommodation";
import UpdateAccommodation from "./components/hostdashboard/UpdateAccommodation";
import DeleteAccommodation from "./components/hostdashboard/DeleteAccommodation";
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import Footer from "./components/Footer";
import {ProtectedRoute} from "./components/protectedroute/ProtectedRoute.tsx";

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
                    <Route path="/work" element={<Work />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/details" element={<Details/>} />
                    <Route path="/assortment" element={<Assortment />} />
                    <Route path="/Guestdashboard" element={<GuestDashboard />}/>

                    {/*/!*host dashboard*!/*/}
                    <Route path="/hostdashboard" element={<HostDashboard />} />
                    <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                    <Route path="/hostdashboard/read" element={<ReadAccommodation />} />
                    <Route path="/hostdashboard/update" element={<UpdateAccommodation />} />
                    <Route path="/hostdashboard/delete" element={<DeleteAccommodation />} />

                    {/*/!* footer Navigation*!/*/}
                    {/*<Route path="/howitworks" element={<HowWorks />} />*/}
                    {/*<Route path="/aboutdomits" element={<AboutDomits />} />*/}
                    {/*<Route path="/work" element={<Work />} />*/}
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />

                    {/*/!* footer Guests*!/*/}
                    {/*<Route path="/profile" element={<Profile />} />*/}
                    {/*<Route path="/booking" element={<Booking />} />*/}
                    {/*<Route path="/settings" element={<Settings />} />*/}

                    {/*/!* footer Hosts*!/*/}
                    {/*<Route path="/payments" element={<Payments />} />*/}
                    {/*<Route path="/calendar" element={<Calendar />} />*/}
                    {/*<Route path="/Hsettings" element={<HSettings />} /> /!*seperate host setting*!/*/}

                    {/*/!* footer Network*!/*/}
                    {/*<Route path="/guests" element={<Guests />} />*/}
                    {/*<Route path="/hosts" element={<Hosts />} />*/}
                    {/*<Route path="/developers" element={<Developers />} />*/}
                    {/*<Route path="/partners" element={<Partners />} />*/}
                    {/*<Route path="/students" element={<Students />} />*/}
                    {/*<Route path="/startups" element={<Startups />} />*/}

                    {/*/!* footer Socials*!/*/}
                    {/*/!*are normal links inside of the footer*!/*/}
                    {/*/!*Languages*!/*/}
                    {/*<Route path="/dutch" element={<Dutch />} />*/}
                    {/*<Route path="/english" element={<English />} />*/}



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
