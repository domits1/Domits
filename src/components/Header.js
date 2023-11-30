import React, { useState } from 'react';
import { Link, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Modal from 'react-modal';
import Logo from '../logo.svg';
import Login from './Login';
import About from './About';
import Home from './Home';
import Booking from './Booking';
import Work from './Work';
import Contact from './Contact';
import Landing from "./Landing";
import HostDashboard from "./hostdashboard/HostDashboard";
import CreateAccommodation from "./hostdashboard/CreateAccommodation";
import DeleteAccommodation from "./hostdashboard/DeleteAccommodation";
import ReadAccommodation from "./hostdashboard/ReadAccommodation";
import UpdateAccommodation from "./hostdashboard/UpdateAccommodation";

function Header() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    return (
        <Router>
            <div className="App">
                <header className="app-header">
                    <nav>
                        <ul>
                            <li>
                                <Link to="/">Landing</Link>
                            </li>
                            <li>
                                <Link to="/home">Home</Link>
                            </li>
                            <li>
                                <Link to="/booking">Do Book</Link>
                            </li>
                            <li>
                                <Link to="/about">Do Extra's</Link>
                            </li>
                            <li>
                                <Link to="/work">Do Work</Link>
                            </li>
                            <li>
                                <Link to="/contact">Do Contact us</Link>
                            </li>
                            <li>
                                <button onClick={openLoginModal}>Login</button>
                            </li>
                        </ul>
                    </nav>
                </header>
            </div>

            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/home" element={<Home />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/about" element={<About />} />
                <Route path="/work" element={<Work />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/hostdashboard" element={<HostDashboard />} />
                <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                <Route path="/hostdashboard/Read" element={<ReadAccommodation />} />
                <Route path="/hostdashboard/Update" element={<UpdateAccommodation />} />
                <Route path="/hostdashboard/delete" element={<DeleteAccommodation />} />
            </Routes>

            {/* Login Modal */}
            <Modal
                isOpen={isLoginModalOpen}
                onRequestClose={closeLoginModal}
                contentLabel="Login Modal"
            >
                {/* Render the Login component inside the modal */}
                <Login />
                <button onClick={closeLoginModal}>Close Modal</button>
            </Modal>
        </Router>
    );
}

export default Header;
