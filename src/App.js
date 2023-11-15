import logo from './logo.svg';
import './App.css';
import Login from "./login.js";
import {useState} from "react";
import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom';

function Home() {
    return (
        <div>
            <h2>Home Page</h2>
            <p>Welcome to the home page!</p>
        </div>
    );
}

function About() {
    return (
        <div>
            <h2>About Page</h2>
            <p>Learn more about our platform here.</p>
        </div>
    );
}

function Login2() {
    return (
        <div>
            <h2>Login Page</h2>
            <p>Log in to access your account.</p>
        </div>
    );
}

function App() {
    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                    <nav>
                        <ul>
                            <li>
                                <Link to="/">Home</Link>
                            </li>
                            <li>
                                <Link to="/about">About</Link>
                            </li>
                            <li>
                                <Link to="/login2">Login2</Link>
                            </li>
                        </ul>
                    </nav>
                </header>

                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/login" element={<Login2 />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;


