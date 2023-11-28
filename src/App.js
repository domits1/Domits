import logo from './logo.svg';
import './App.css';
import Login from "./components/Login.js";
import About from "./components/About.js";
import Booking from "./components/Booking.js";
import {useState} from "react";
import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom';
import Home from "./components/Home";
import Header from "./components/Header";


function App() {
    return (
       <Header/>
    )
}

export default App;