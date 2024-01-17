import React, {useState} from "react";
import Accommodations from "./Accommodations";
import Header from "./Header";
import Modal from "react-modal";
import Login from "./Login";

const Assortment = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterQuery, setFilterQuery] = useState("");

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleFilter = (query) => {
        setFilterQuery(query);
    };

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    return (
        <div>
            <Header openLoginModal={openLoginModal} />
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
            <div className="assortment">
                <div id="search-container">
                    <input
                        type="search"
                        id="search-input"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div id="filter-container">
                    <input
                        type="text"
                        id="filter-input"
                        placeholder="Filter"
                        value={filterQuery}
                        onChange={(e) => handleFilter(e.target.value)}
                    />
                </div>
                <div className="array">
                    <Accommodations searchQuery={searchQuery} filterQuery={filterQuery}/>
                </div>
            </div>
        </div>
    );
};

export default Assortment;
