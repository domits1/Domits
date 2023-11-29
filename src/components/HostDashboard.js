import React, { useState } from 'react';
import backgroundImage from "../images/landingpagebg.png";

const HostDashboard = () => {
    const [formState, setFormState] = useState({
        title: '',
        housenumber: '',
        location: '',
        persons: '',
        bedrooms: '',
        price: '',
        descriptions: '',
        services: {
            bikes: false,
            electricity: false,
            bbq: false,
            lockerOnStrand: false,
            trampoline: false,
            microwave: false,
            babyCrib: false,
            toys: false,
        },
        pictures: [],
    });

    const styles = {
        margin: '120px auto', // Adjust the margin values as needed
        maxWidth: '600px',   // Optional: Set a maximum width for the form
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        if (type === 'checkbox') {
            setFormState((prevState) => ({
                ...prevState,
                services: {
                    ...prevState.services,
                    [name]: checked,
                },
            }));
        } else if (type === 'file') {
            setFormState((prevState) => ({
                ...prevState,
                pictures: files,
            }));
        } else {
            setFormState((prevState) => ({
                ...prevState,
                [name]: value,
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add submission logic . for example the dynamo database on amazon
        console.log(formState);
    };

    return (
        <form style={styles} onSubmit={handleSubmit}>
            <table>
                <tbody>
                <tr>
                    <td>
                        <label>Title:</label>
                    </td>
                    <td>
                        <input type="text" name="title" value={formState.title} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>House Number:</label>
                    </td>
                    <td>
                        <input type="text" name="housenumber" value={formState.housenumber} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Location:</label>
                    </td>
                    <td>
                        <input type="text" name="location" value={formState.location} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Persons:</label>
                    </td>
                    <td>
                        <input type="text" name="persons" value={formState.persons} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Bedrooms:</label>
                    </td>
                    <td>
                        <input type="text" name="bedrooms" value={formState.bedrooms} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Price:</label>
                    </td>
                    <td>
                        <input type="text" name="price" value={formState.price} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Description:</label>
                    </td>
                    <td>
                        <input type="text" name="description" value={formState.descriptions} onChange={handleChange} />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>Services:</label>
                    </td>
                    <td>
                        <br />
                        <input type="checkbox" name="bikes" checked={formState.services.bikes} onChange={handleChange} />
                        Bikes
                        <br />
                        <input type="checkbox" name="electricity" checked={formState.services.electricity} onChange={handleChange} />
                        Electricity
                        <br />
                        <input type="checkbox" name="bbq" checked={formState.services.bbq} onChange={handleChange} />
                        BBQ
                        <br />
                        <input type="checkbox" name="beachSafe" checked={formState.services.beachSafe} onChange={handleChange} />
                        Beach Safe
                        <br />
                        <input type="checkbox" name="trampoline" checked={formState.services.trampoline} onChange={handleChange} />
                        Trampoline
                        <br />
                        <input type="checkbox" name="microwave" checked={formState.services.microwave} onChange={handleChange} />
                        Microwave
                        <br />
                        <input type="checkbox" name="babyCrib" checked={formState.services.babyCrib} onChange={handleChange} />
                        Baby Crib
                        <br />
                        <input type="checkbox" name="toys" checked={formState.services.toys} onChange={handleChange} />
                        Toys
                    </td>
                </tr>
                </tbody>
            </table>
            <br />
            <button type="submit">Submit</button>
        </form>



                        );
};

export default HostDashboard;


