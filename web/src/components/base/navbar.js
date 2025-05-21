import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';


const Navbar = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (!isLoggedIn && (path === "/chat" || path === "/guestdashboard")) {
      navigate("/login"); // Redirect to login if not logged in
    } else {
      navigate(path); // Navigate to the desired path
    }
  };

  return (
    <nav className="bottom-navbar">
      <div className="nav-item" onClick={() => handleNavigation("/home")}>
        <Home size={24} />
        <span>Home</span>
      </div>

      <div className="nav-item" onClick={() => handleNavigation("/chat")}>
        <MessageCircle size={24} />
        <span>Messages</span>
      </div>

      <div className="nav-item" onClick={() => handleNavigation("/guestdashboard")}>
        <User size={24} />
        <span>Account</span>
      </div>
    </nav>
  );
};

export default Navbar;