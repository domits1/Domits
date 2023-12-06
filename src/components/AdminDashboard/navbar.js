import VectorImage from './img/Vector.png';

const Navbar = () => {
    return ( 
        <nav className="navbar">
            <img src={VectorImage} alt="logo.png"/>
            <div className="nav">
                <p>Stefan Hopman</p>
                <h4>superadmin</h4>
            </div>
        </nav>
    );
}
 
export default Navbar;
