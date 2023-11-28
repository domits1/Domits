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
                                <Link to="/">Home -</Link>
                            </li>
                            <li>
                                <Link to="/booking">Do Book -</Link>
                            </li>
                            <li>
                                <Link to="/about">Do Extra's -</Link>
                            </li>
                            <li>
                                <Link to="/work">Do Work -</Link>
                            </li>
                            <li>
                                <Link to="/contact">Do Contact us -</Link>
                            </li>
                            <li>
                                <button onClick={openLoginModal}>Login -</button>
                            </li>
                        </ul>
                    </nav>
                </header>
            </div>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/about" element={<About />} />
                <Route path="/work" element={<Work />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
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
