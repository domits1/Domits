import './App.css';
import Header from "./components/base/Header";
import Footer from "./components/base/Footer";
import Landing from "./components/landingpage/Landing";
import Travelinnovation from "./components/ninedots/travelinnovation";
import Assortment from './components/assortment/Assortment';
import Home from "./components/home/Home";
import Booking from "./components/booking/Booking";
import About from "./components/about/About";
import Careers from "./components/careers/Careers";
import Contact from "./components/contact/Contact";
import HostHomepage from "./components/hostdashboard/HostHomepage";
import Details from './components/details/Details';
import HomeDashboard from "./components/admindashboard/HomeDashboard";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import React, {useEffect, useState} from "react";
import Modal from "react-modal";
import CreateAccommodation from "./components/hostdashboard/CreateAccommodation";
import ReadAccommodation from "./components/hostdashboard/ReadAccommodation";
import UpdateAccommodation from "./components/hostdashboard/UpdateAccommodation";
import DeleteAccommodation from "./components/hostdashboard/DeleteAccommodation";
import GuestDashboard from './components/guestdashboard/GuestDashboard';
import {ProtectedRoute} from "./components/protectedroute/ProtectedRoute.tsx";
import Disclaimers from "./components/disclaimers/Disclaimers";
import Policy from "./components/disclaimers/Policy";
import Terms from "./components/disclaimers/Terms";
import Login from "./components/base/Login";
import Register from "./components/base/Register";
import ConfirmRegister from "./components/base/ConfirmRegister";
import Error from "./components/errorpage/errorpage";
import Stripe from 'stripe';
//import Release from "./components/release/Release";
import Chat from "./components/chat/Chat";
export const stripe = new Stripe(process.env.STRIPE_TEST_KEY);
import PaymentsGuestDashboard from "./components/guestdashboard/PaymentsGuestDashboard";


// Set the app element for react-modal
Modal.setAppElement('#root'); // Assuming your root element has the id 'root'


function App() {
    useEffect(() => {
        return () => {
            document.title = 'Domits';
        };
    }, []);

    // Conditionally render the Header based on the current route
    const renderHeader = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin') {
            return null;
        }
        return <Header />;
    };

    const renderFooter = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin') {
            return null; // Don't render Footer for /admin route
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
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/confirm-email" element={<ConfirmRegister />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/travelinnovation" element={<Travelinnovation />} />
                    <Route path="/career" element={<Careers />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/details" element={<Details/>} />
                    <Route path="/assortment" element={<Assortment />} />
                    <Route path="/guestdashboard" element={<GuestDashboard />}/>
                    <Route path="/guestdashboard/messages" element={<Details />}/>
                    <Route path="/guestdashboard/payments" element={<PaymentsGuestDashboard />}/>
                    <Route path="/guestdashboard/reviews" element={<GuestDashboard />}/>
                    <Route path="/guestdashboard/settings" element={<GuestDashboard />}/>
                    <Route path="/career" element={<Careers />} />
                    <Route path="/hosthomepage" element={<HostHomepage />} />
                    <Route path="/landing" element={<Landing />}/>
                    <Route path="/hostdashboard/create" element={<CreateAccommodation />} />
                    <Route path="/hostdashboard/read" element={<ReadAccommodation />} />
                    <Route path="/hostdashboard/update" element={<UpdateAccommodation />} />
                    <Route path="/hostdashboard/delete" element={<DeleteAccommodation />} />
                    <Route path="/disclaimers" element={<Disclaimers />} />
                    <Route path="/policy" element={<Policy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/error" element={<Error/>}/>
                    {/*<Route path="/release" element={<Release/>}/>*/}
                    <Route path="/chat" element={<Chat/>}/>



                    {/*  Admin Routes  */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={["Admin"]} page={<HomeDashboard/>} redirectTo='/' />} />
                </Routes>
            </div>
            {renderFooter()}
        </Router>
    );
}

export default App;
