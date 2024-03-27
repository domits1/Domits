import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';

function Country({ handleInputChange, formData }) {
    const [address, setAddress] = useState('');
    const [showResults, setShowResults] = useState(false);

    const handleChange = (address) => {
        setAddress(address);
        handleInputChange({ target: { name: 'Country', value: address } });
    };

    const handleSelect = async (address) => {
        setAddress(address);
        try {
            const results = await geocodeByAddress(address);
            const latLng = await getLatLng(results[0]);
            console.log('Geocode Success', latLng);
            setShowResults(true);
            handleInputChange({ target: { name: 'Country', value: address } });
        } catch (error) {
            console.error('Error', error);
            setShowResults(false);
        }
    };

    return (
        <PlacesAutocomplete
            value={address}
            onChange={handleChange}
            onSelect={handleSelect}
            searchOptions={{ language: 'en' }}
        >
            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                <div className="autocomplete-container">
                    <input
                        {...getInputProps({
                            placeholder: 'Search Places . . .',
                            className: 'searchBar',
                        })}
                    />
                    <div className="suggestions-container" style={{ marginTop: '25px', fontWeight: 'bold', }}>
                        {loading ? <div>Loading...</div> : null}
                        {suggestions.map((suggestion) => {
                            if (suggestion.types.includes('locality') || suggestion.types.includes('country')) {
                                const style = {
                                    backgroundColor: suggestion.active ? '#f0f0f0' : '#fff',
                                    padding: '18px 10px',
                                    borderBottom: '2px solid #ddd',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    fontSize: '15px',
                                    color: '#000',
                                    borderRadius: '1px',
                                    margin: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '300px',
                                };

                                return (
                                    <div
                                        {...getSuggestionItemProps(suggestion, { style })}
                                        className="suggestion-item"
                                    >
                                        <FaMapMarkerAlt
                                            style={{
                                                marginRight: '10px',
                                                backgroundColor: 'lightgray',
                                                border: '1px solid #ccc',
                                                borderRadius: '25%',
                                                padding: '5px',
                                                fontSize: '20px',
                                                color: '#000'
                                            }}
                                        />
                                        {suggestion.description}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}
        </PlacesAutocomplete>
    );
}

export default Country;
