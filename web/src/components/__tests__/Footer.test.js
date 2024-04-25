// import React from 'react';
// import { render, fireEvent } from '@testing-library/react';
// import Footer from '../base/Footer';
// import { BrowserRouter as Router } from 'react-router-dom';

// describe('Footer Component', () => {
//     //Footer loads in
//     it('renders without crashing', () => {
//         render(
//             <Router>
//                 <Footer />
//             </Router>
//         );
//     });

//     // Test Footer links links
//     it('navigates to correct page when navigation links are clicked', () => {
//         const { getByText } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         fireEvent.click(getByText('How it works'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('Why Domits'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('Jobs'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('About'));
//         expect(window.location.pathname).toBe('/about');

//         fireEvent.click(getByText('Release'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('Contact'));
//         expect(window.location.pathname).toBe('/contact');

//         // Add more navigation links as needed
//     });

//     it('navigates to correct page when guests links are clicked', () => {
//         const { getByText } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         fireEvent.click(getByText('Search and book'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('Helpdesk'));
//         expect(window.location.pathname).toBe('/');


//         // Add more guests links as needed
//     });

//     it('navigates to correct page when Network links are clicked', () => {
//         const { getByText } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         fireEvent.click(getByText('Guests'));
//         expect(window.location.pathname).toBe('/');

//         // fireEvent.click(getByText('Hosts'));
//         // expect(window.location.pathname).toBe('/landing');

//         fireEvent.click(getByText('Developers'));
//         expect(window.location.pathname).toBe('/developers');

//         fireEvent.click(getByText('Students'));
//         expect(window.location.pathname).toBe('/students');

//         fireEvent.click(getByText('Startups'));
//         expect(window.location.pathname).toBe('/startups');


//         // Add more hosts links as needed
//     });

//     it('navigates to correct page when hosts links are clicked', () => {
//         const { getByText } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         fireEvent.click(getByText('Become a host'));
//         expect(window.location.pathname).toBe('/');

//         fireEvent.click(getByText('Helpdesk for hosts'));
//         expect(window.location.pathname).toBe('/');


//         // Add more hosts links as needed
//     });

//     // Test social media links
//     it('opens correct social media page when social media links are clicked', () => {
//         const { getByText } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         // fireEvent.click(getByText('Linkedin'));
//         // expect(window.location.href).toBe('https://www.linkedin.com/company/domits');

//         // Add more social media link tests as needed
//     });

//     // Test currency dropdown
//     it('updates currency correctly when selecting from currency dropdown', () => {
//         const { getByTestId } = render(
//             <Router>
//                 <Footer />
//             </Router>
//         );

//         // const currencyDropdown = getByTestId('currency-dropdown');
//         // fireEvent.change(currencyDropdown, { target: { value: 'dollar' } });
//         // expect(currencyDropdown.value).toBe('dollar');

//         // Add more currency dropdown tests as needed
//     });

//     // Test language dropdown
//     // it('updates language correctly when selecting from language dropdown', () => {
//     //     const { getByTestId } = render(
//     //         <Router>
//     //             <Footer />
//     //         </Router>
//     //     );
//     //
//     //     const languageDropdown = getByTestId('language-dropdown');
//     //     fireEvent.change(languageDropdown, { target: { value: 'dutch' } });
//     //     expect(languageDropdown.value).toBe('dutch');
//     //
//     //     // Add more language dropdown tests as needed
//     // });

//     // You can add more test cases to cover additional functionalities
// });
