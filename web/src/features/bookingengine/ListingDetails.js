import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from "react-router-dom";
// import "./listing.css";
import ImageGallery from './ImageGallery';
import DateFormatterYYYY_MM_DD from "../../utils/DateFormatterYYYY_MM_DD";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import BookingCalendar from "./BookingCalendar";
import {Auth} from "aws-amplify";
import {FaTimes} from 'react-icons/fa';
import DemoValidator from './DemoValidator';
import ChairIcon from '@mui/icons-material/Chair';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import TvIcon from '@mui/icons-material/Tv';
import RadarIcon from '@mui/icons-material/Radar';
import WifiIcon from '@mui/icons-material/Wifi';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import DeskIcon from '@mui/icons-material/Desk';
import FireExtinguisherIcon from '@mui/icons-material/FireExtinguisher';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import KitchenIcon from '@mui/icons-material/Kitchen';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import GrassIcon from '@mui/icons-material/Grass';
import BlenderIcon from '@mui/icons-material/Blender';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import TableBarIcon from '@mui/icons-material/TableBar';
import CribIcon from '@mui/icons-material/Crib';
import HvacIcon from '@mui/icons-material/Hvac';
import FenceIcon from '@mui/icons-material/Fence';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import BedIcon from '@mui/icons-material/Bed';
import WcIcon from '@mui/icons-material/Wc';
import SoapIcon from '@mui/icons-material/Soap';
import MicrowaveIcon from '@mui/icons-material/Microwave';
import BreakfastDiningIcon from '@mui/icons-material/BreakfastDining';
import FlatwareIcon from '@mui/icons-material/Flatware';
import FreeBreakfastIcon from '@mui/icons-material/FreeBreakfast';
import FoodBankIcon from '@mui/icons-material/FoodBank';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import AirIcon from '@mui/icons-material/Air';
import IronIcon from '@mui/icons-material/Iron';
import WeekendIcon from '@mui/icons-material/Weekend';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CastIcon from '@mui/icons-material/Cast';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import SmokeFreeIcon from '@mui/icons-material/SmokeFree';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import ToysIcon from '@mui/icons-material/Toys';
import BathtubIcon from '@mui/icons-material/Bathtub';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import MapIcon from '@mui/icons-material/Map';
import OutdoorGrillIcon from '@mui/icons-material/OutdoorGrill';
import LuggageIcon from '@mui/icons-material/Luggage';
import HotTubIcon from '@mui/icons-material/HotTub';
import CoffeeMakerIcon from '@mui/icons-material/CoffeeMaker';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import BalconyIcon from '@mui/icons-material/Balcony';
import EvStationIcon from '@mui/icons-material/EvStation';
import AccessibleIcon from '@mui/icons-material/Accessible';
import DoorSlidingIcon from '@mui/icons-material/DoorSliding';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SpaIcon from '@mui/icons-material/Spa';
import RecyclingIcon from '@mui/icons-material/Recycling';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import DeleteIcon from '@mui/icons-material/Delete';
import FireplaceIcon from '@mui/icons-material/Fireplace';
import PoolIcon from '@mui/icons-material/Pool';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import ShowerIcon from '@mui/icons-material/Shower';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import SpeakerIcon from '@mui/icons-material/Speaker';
import DeckIcon from '@mui/icons-material/Deck';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScubaDivingIcon from '@mui/icons-material/ScubaDiving';
import PhishingIcon from '@mui/icons-material/Phishing';
import DownhillSkiingIcon from '@mui/icons-material/DownhillSkiing';
import PedalBikeIcon from '@mui/icons-material/PedalBike';
import ControlCameraIcon from '@mui/icons-material/ControlCamera';
import NavigationIcon from '@mui/icons-material/Navigation';
import SevereColdIcon from '@mui/icons-material/SevereCold';
import ChairAltIcon from '@mui/icons-material/ChairAlt';
import {touristTaxRates, vatRates} from "../../utils/CountryVATRatesAndTouristTaxes";

const ListingDetails = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const id = searchParams.get('ID');
    const [accommodation, setAccommodation] = useState(null);
    const [host, setHost] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [checkIn, setCheckIn] = useState(null);
    const [checkOut, setCheckOut] = useState(null);
    const [minStart, setMinStart] = useState(null);
    const [maxStart, setMaxStart] = useState(null);
    const [minEnd, setMinEnd] = useState(null);
    const [maxEnd, setMaxEnd] = useState(null);
    const [inputError, setInputError] = useState(false);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [pets, setPets] = useState(0);
    const [isFormValid, setIsFormValid] = useState(false);
    const [bookedDates, setBookedDates] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [ServiceFee, setServiceFee] = useState(0);
    const [cleaningFee, setCleaningFee] = useState(0);
    const [taxes, setTaxes] = useState(0);
    const [amountOfGuest, setAmountOfGuest] = useState(0);
    const [hostID, setHostID] = useState();
    const [showAll, setShowAll] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [userID, setUserID] = useState('');
    const [showGuestPopup, setShowGuestPopup] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Add this line
    const guestSummary = `${adults} Adult${adults > 1 ? 's' : ''}, ${children} Child${children !== 1 ? 'ren' : ''}, ${pets} Pet${pets > 1 ? 's' : ''}`;
    const popupRef = useRef(null);
    const [bookings, setBookings] = useState([]);


    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const featureIcons = {
        // Essentials
        'Wi-Fi': <WifiIcon sx={{color: 'var(--primary-color)'}}/>,
        'Air conditioning': <AcUnitIcon sx={{color: 'var(--primary-color)'}}/>,
        'Heating': <HvacIcon sx={{color: 'var(--primary-color)'}}/>,
        'TV with cable/satellite': <TvIcon sx={{color: 'var(--primary-color)'}}/>,
        'Hot water': <WhatshotIcon sx={{color: 'var(--primary-color)'}}/>,
        'Towels': <CheckroomIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bed linens': <BedIcon sx={{color: 'var(--primary-color)'}}/>,
        'Extra pillows and blankets': <BedIcon sx={{color: 'var(--primary-color)'}}/>,
        'Toilet paper': <WcIcon sx={{color: 'var(--primary-color)'}}/>,
        'Soap and shampoo': <SoapIcon sx={{color: 'var(--primary-color)'}}/>,

        // Kitchen
        'Refrigerator': <KitchenIcon sx={{color: 'var(--primary-color)'}}/>,
        'Microwave': <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>,
        'Oven': <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>,
        'Stove': <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>,
        'Dishwasher': <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>,
        'Coffee maker': <CoffeeMakerIcon sx={{color: 'var(--primary-color)'}}/>,
        'Toaster': <BreakfastDiningIcon sx={{color: 'var(--primary-color)'}}/>,
        'Basic cooking essentials': <FlatwareIcon sx={{color: 'var(--primary-color)'}}/>,
        'Dishes and silverware': <FlatwareIcon sx={{color: 'var(--primary-color)'}}/>,
        'Glasses and mugs': <FreeBreakfastIcon sx={{color: 'var(--primary-color)'}}/>,
        'Cutting board and knives': <FoodBankIcon sx={{color: 'var(--primary-color)'}}/>,
        'Blender': <BlenderIcon sx={{color: 'var(--primary-color)'}}/>,
        'Kettle': <EmojiFoodBeverageIcon sx={{color: 'var(--primary-color)'}}/>,

        // Bathroom
        'Hair dryer': <AirIcon sx={{color: 'var(--primary-color)'}}/>,
        'Shower gel': <SoapIcon sx={{color: 'var(--primary-color)'}}/>,
        'Conditioner': <SoapIcon sx={{color: 'var(--primary-color)'}}/>,
        'Body lotion': <SoapIcon sx={{color: 'var(--primary-color)'}}/>,
        'First aid kit': <MedicalServicesIcon sx={{color: 'var(--primary-color)'}}/>,

        // Bedroom
        'Hangers': <CheckroomIcon sx={{color: 'var(--primary-color)'}}/>,
        'Iron and ironing board': <IronIcon sx={{color: 'var(--primary-color)'}}/>,
        'Closet/drawers': <CheckroomIcon sx={{color: 'var(--primary-color)'}}/>,
        'Alarm clock': <AccessAlarmIcon sx={{color: 'var(--primary-color)'}}/>,

        // LivingArea
        'Sofa': <WeekendIcon sx={{color: 'var(--primary-color)'}}/>,
        'Armchairs': <ChairIcon sx={{color: 'var(--primary-color)'}}/>,
        'Coffee table': <TableBarIcon sx={{color: 'var(--primary-color)'}}/>,
        'Books and magazines': <LibraryBooksIcon sx={{color: 'var(--primary-color)'}}/>,
        'Board games': <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>,

        // Technology
        'Smart TV': <TvIcon sx={{color: 'var(--primary-color)'}}/>,
        'Streaming services': <CastIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bluetooth speaker': <BluetoothIcon sx={{color: 'var(--primary-color)'}}/>,
        'Universal chargers': <ElectricalServicesIcon sx={{color: 'var(--primary-color)'}}/>,
        'Work desk and chair': <DeskIcon sx={{color: 'var(--primary-color)'}}/>,

        // Safety
        'Smoke detector': <SmokeFreeIcon sx={{color: 'var(--primary-color)'}}/>,
        'Carbon monoxide detector': <RadarIcon sx={{color: 'var(--primary-color)'}}/>,
        'Fire extinguisher': <FireExtinguisherIcon sx={{color: 'var(--primary-color)'}}/>,
        'Lock on bedroom door': <LockPersonIcon sx={{color: 'var(--primary-color)'}}/>,

        // FamilyFriendly
        'High chair': <ChairAltIcon sx={{color: 'var(--primary-color)'}}/>,
        'Crib': <CribIcon sx={{color: 'var(--primary-color)'}}/>,
        'Children’s books and toys': <ToysIcon sx={{color: 'var(--primary-color)'}}/>,
        'Baby safety gates': <FenceIcon sx={{color: 'var(--primary-color)'}}/>,
        'Baby bath': <BathtubIcon sx={{color: 'var(--primary-color)'}}/>,
        'Baby monitor': <LiveTvIcon sx={{color: 'var(--primary-color)'}}/>,

        // Laundry
        'Washer and dryer': <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>,
        'Laundry detergent': <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>,
        'Clothes drying rack': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,

        // Convenience
        'Keyless entry': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Self-check-in': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Local maps and guides': <MapIcon sx={{color: 'var(--primary-color)'}}/>,
        'Luggage drop-off allowed': <LuggageIcon sx={{color: 'var(--primary-color)'}}/>,
        'Parking space': <LocalParkingIcon sx={{color: 'var(--primary-color)'}}/>,
        'EV charger': <EvStationIcon sx={{color: 'var(--primary-color)'}}/>,

        // Accessibility
        'Step-free access': <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Wide doorways': <DoorSlidingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Accessible-height bed': <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Accessible-height toilet': <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Shower chair': <BathtubIcon sx={{color: 'var(--primary-color)'}}/>,

        // ExtraServices
        'Cleaning service (add service fee manually)': <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>,
        'Concierge service': <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>,
        'Housekeeping': <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>,
        'Grocery delivery': <LocalGroceryStoreIcon sx={{color: 'var(--primary-color)'}}/>,
        'Airport shuttle': <AirportShuttleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Private chef': <RamenDiningIcon sx={{color: 'var(--primary-color)'}}/>,
        'Personal trainer': <DirectionsRunIcon sx={{color: 'var(--primary-color)'}}/>,
        'Massage therapist': <SpaIcon sx={{color: 'var(--primary-color)'}}/>,

        // EcoFriendly
        'Recycling bins': <RecyclingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Energy-efficient appliances': <EnergySavingsLeafIcon sx={{color: 'var(--primary-color)'}}/>,
        'Solar panels': <SolarPowerIcon sx={{color: 'var(--primary-color)'}}/>,
        'Composting bin': <DeleteIcon sx={{color: 'var(--primary-color)'}}/>,

        // Outdoor
        'Patio or balcony': <BalconyIcon sx={{color: 'var(--primary-color)'}}/>,
        'Outdoor furniture': <OutdoorGrillIcon sx={{color: 'var(--primary-color)'}}/>,
        'Grill': <OutdoorGrillIcon sx={{color: 'var(--primary-color)'}}/>,
        'Fire pit': <FireplaceIcon sx={{color: 'var(--primary-color)'}}/>,
        'Pool': <PoolIcon sx={{color: 'var(--primary-color)'}}/>,
        'Hot tub': <HotTubIcon sx={{color: 'var(--primary-color)'}}/>,
        'Garden or backyard': <GrassIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bicycle': <DirectionsBikeIcon sx={{color: 'var(--primary-color)'}}/>,

        // Boat-specific
        'Bimini': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Outdoor shower': <ShowerIcon sx={{color: 'var(--primary-color)'}}/>,
        'External table': <TableRestaurantIcon sx={{color: 'var(--primary-color)'}}/>,
        'External speakers': <SpeakerIcon sx={{color: 'var(--primary-color)'}}/>,
        'Teak deck': <DeckIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bow sundeck': <DeckIcon sx={{color: 'var(--primary-color)'}}/>,
        'Aft sundeck': <DeckIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bathing Platform': <ShowerIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bathing ladder': <PoolIcon sx={{color: 'var(--primary-color)'}}/>,

        // NavigationalEquipment
        'Bow thruster': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Electric windlass': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Autopilot': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'GPS': <LocationOnIcon sx={{color: 'var(--primary-color)'}}/>,
        'Depth sounder': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'VHF': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Guides & Maps': <MapIcon sx={{color: 'var(--primary-color)'}}/>,

        // LeisureActivities
        'Snorkeling equipment': <ScubaDivingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Fishing equipment': <PhishingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Diving equipment': <ScubaDivingIcon sx={{color: 'var(--primary-color)'}}/>,

        // WaterSports
        'Water skis': <DownhillSkiingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Monoski': <DownhillSkiingIcon sx={{color: 'var(--primary-color)'}}/>,
        'Wakeboard': <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>,
        'Towable Tube': <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>,
        'Inflatable banana': <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>,
        'Kneeboard': <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>,

        // Camper-specific
        'Baby seat': <ChildCareIcon sx={{color: 'var(--primary-color)'}}/>,
        'Bicycle carrier': <PedalBikeIcon sx={{color: 'var(--primary-color)'}}/>,
        'Reversing camera': <ControlCameraIcon sx={{color: 'var(--primary-color)'}}/>,
        'Airbags': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Cruise control': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Imperial': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Navigation': <NavigationIcon sx={{color: 'var(--primary-color)'}}/>,
        'Awning': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Parking sensors': <ControlCameraIcon sx={{color: 'var(--primary-color)'}}/>,
        'Power steering': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Tow bar': <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>,
        'Snow chains': <SevereColdIcon sx={{color: 'var(--primary-color)'}}/>,
        'Winter tires': <SevereColdIcon sx={{color: 'var(--primary-color)'}}/>,
    };
    
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                await Auth.currentAuthenticatedUser();
                setIsAuthenticated(true);
            } catch (error) {
                setIsAuthenticated(false);
            }
        };

        checkAuthStatus();
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowGuestPopup(false);
            }
        }

        if (showGuestPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showGuestPopup]);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showModal]);

    const toggleDropdown = (e) => {
        e.stopPropagation();
        setShowGuestPopup(!showGuestPopup);
    };

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    const FeaturePopup = ({features, onClose}) => {
        const categoryOrder = ['Essentials', 'Convenience', 'Accessibility', 'Bedroom'];
        const sortedCategories = Object.keys(features).sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            const orderA = indexA !== -1 ? indexA : categoryOrder.length;
            const orderB = indexB !== -1 ? indexB : categoryOrder.length;

            if (orderA === categoryOrder.length && orderB === categoryOrder.length) {
                return a.localeCompare(b);
            }
            return orderA - orderB;
        });

        console.log('Sorted categories:', sortedCategories);

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-contentPopUp" onClick={e => e.stopPropagation()}>
                    <button className="close-button" onClick={onClose}>✖</button>
                    <h2>What does this place have to offer?</h2>
                    {sortedCategories.map(category => {
                        const categoryItems = features[category];
                        if (categoryItems.length > 0) {
                            return (
                                <div key={category} className='features-category'>
                                    <h3>{category}</h3>
                                    <hr className="pageDividerr"/>
                                    <ul>
                                        {categoryItems.map((item, index) => (
                                            <li key={index} className='category-item'>
                                                {typeof featureIcons[item] === 'string' ? (
                                                    <img src={featureIcons[item]} className='feature-icon'
                                                         alt={`${item} icon`}/>
                                                ) : (
                                                    featureIcons[item] && React.isValidElement(featureIcons[item]) ? (
                                                        <span className='feature-icon'>{featureIcons[item]}</span>
                                                    ) : (
                                                        <span>{item}</span>
                                                    )
                                                )}
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        );
    };


    useEffect(() => {
        const appendUserID = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                if (userInfo) {
                    setUserID(userInfo.attributes.sub);
                }
            } catch (error) {
                console.error('Error logging in:', error);
            }
        };
        appendUserID();
    }, []);
    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ID: id}),
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const responseData = await response.json();
                const data = JSON.parse(responseData.body);
                console.log(data)
                setAccommodation(data);
                setDates(data.StartDate, data.EndDate, data.BookedDates || []);
                fetchHostInfo(data.OwnerId);
                setHostID(data.OwnerId)
                fetchReviewsByAccommodation(data.ID);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };

        fetchAccommodation();
    }, [id]);

    useEffect(() => {
            if (!accommodation) return;
            const fetchBookings = async () => {
                try {
                    const response = await fetch('https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingByAccommodationAndStatus', {
                        method: 'POST',
                        body: JSON.stringify({
                            AccoID: accommodation.ID,
                            Status: 'Accepted'
                        }),
                        headers: {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }
                    const data = await response.json();

                    if (data.body && typeof data.body === 'string') {
                        const retrievedBookingDataArray = JSON.parse(data.body);

                        if (Array.isArray(retrievedBookingDataArray)) {
                            setBookings(retrievedBookingDataArray);
                            setBookedDates(retrievedBookingDataArray.map(booking => [booking.StartDate, booking.EndDate]));
                        } else {
                            console.error('Retrieved data is not an array:', retrievedBookingDataArray);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch booking data:', error);
                }
            }
            fetchBookings();
        }, [accommodation]
    );

    const {isDemo} = DemoValidator(hostID);

    const fetchReviewsByAccommodation = async (accoId) => {
        try {
            const requestData = {
                accoId: accoId
            };
            const response = await fetch(`https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviewByAccoId`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch host information');
            }
            const responseData = await response.json();
            setReviews(responseData);
        } catch (error) {
            console.error('Error fetching host info:', error);
        }
    }

    const fetchHostInfo = async (ownerId) => {
        try {
            const requestData = {
                OwnerId: ownerId
            };
            const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch host information');
            }
            const responseData = await response.json();
            const hostData = JSON.parse(responseData.body)[0];
            setHost(hostData);

        } catch (error) {
            console.error('Error fetching host info:', error);
        }
    };

    const getHostName = (host) => {
        return host?.Attributes?.find(attr => attr.Name === 'given_name')?.Value || 'Unknown Host';
    };

    useEffect(() => {
        checkFormValidity();
    }, [checkIn, checkOut, adults, children]);

    useEffect(() => {
        const restrictDates = () => {
            if (checkIn) {
                const minEnd = new Date(checkIn);
                minEnd.setUTCDate(minEnd.getUTCDate() + 1);
                setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
                if (checkOut && new Date(checkOut) <= new Date(checkIn)) {
                    setCheckOut('');
                }
            }
        };
        restrictDates();
    }, [checkIn]);

    const handleChange = (value, setType) => {
        const newValue = parseInt(value, 10) || 0;
        setType(newValue);

        const total = (setType === setAdults ? newValue + children : adults + newValue);

        if (total > accommodation.GuestAmount) {
            setInputError(true);
        } else {
            setInputError(false);
        }
        checkFormValidity();
    };

    const setDates = (StartDate, EndDate, bookedDates) => {
        const today = new Date();
        const parsedStartDate = today > new Date(StartDate) ? today : new Date(StartDate);
        const parsedEndDate = new Date(EndDate);
        const maxStart = new Date(parsedEndDate);
        maxStart.setUTCDate(maxStart.getUTCDate() - 1);

        const minEnd = new Date(parsedStartDate);
        minEnd.setUTCDate(minEnd.getUTCDate() + 1);

        setMinStart(DateFormatterYYYY_MM_DD(parsedStartDate));
        setMaxStart(DateFormatterYYYY_MM_DD(maxStart));
        setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
        setMaxEnd(DateFormatterYYYY_MM_DD(parsedEndDate));
        setBookedDates(bookedDates); // Save booked dates in state
    };
    useEffect(() => {
        const restrictCheckOutToDateRange = () => {
            if (checkIn) {
                for (let i = 0; i < accommodation.DateRanges.length; i++) {
                    let index = accommodation.DateRanges[i];
                    if (isDateInRange(new Date(checkIn), new Date(index.startDate), new Date(index.endDate))) {
                        setMaxEnd(DateFormatterYYYY_MM_DD(new Date(index.endDate)));
                    }
                }
            } else {
                setMaxEnd(null);
            }
        }
        restrictCheckOutToDateRange();
    }, [checkIn]);
    useEffect(() => {
        const restrictCheckInToDateRange = () => {
            if (checkOut) {
                for (let i = 0; i < accommodation.DateRanges.length; i++) {
                    let index = accommodation.DateRanges[i];
                    if (isDateInRange(new Date(checkOut), new Date(index.startDate), new Date(index.endDate))) {
                        setMinStart(DateFormatterYYYY_MM_DD(new Date(index.startDate)));
                    }
                }
            } else {
                setMinStart(null);
            }
        }
        restrictCheckInToDateRange();
    }, [checkOut]);

    const handleCheckInChange = (date) => {
        setCheckIn(date);
    };

    const handleCheckOutChange = (date) => {
        setCheckOut(date);
    };

    const checkFormValidity = () => {
        if (checkIn && checkOut && adults > 0 && !inputError) {
            if (new Date(checkOut) > new Date(checkIn)) {
                setIsFormValid(true);
            } else {
                setIsFormValid(false);
            }
        } else {
            setIsFormValid(false);
        }
    };

    useEffect(() => {
        const calculateTotal = () => {
            if (!accommodation || !checkIn || !checkOut) return;

            const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
            const basePrice = nights * accommodation.Rent * 100;
            const cleaningFee = accommodation.CleaningFee ? parseFloat(accommodation.CleaningFee * 100) : 0;
            const calculatedServiceFee = basePrice * 0.15;

            const countryVAT = vatRates.find(rate => rate.country === accommodation?.Country)?.vat || "0";
            const vatRate = parseFloat(countryVAT);

            const countryTouristTax = touristTaxRates.find(rate => rate.country === accommodation?.Country)?.touristTax || "0";


            const calculatedVatRate = parseFloat(basePrice * vatRate / 100);

            let calculatedTouristTaxRate;
            if (countryTouristTax.includes('%')) {
                const taxRate = parseFloat(countryTouristTax.replace('%', ''));
                calculatedTouristTaxRate = parseFloat(basePrice * taxRate / 100);
            } else if (countryTouristTax.includes('EUR') || countryTouristTax.includes('USD') || countryTouristTax.includes('GBP')) {
                calculatedTouristTaxRate = parseFloat((countryTouristTax.replace(/[^\d.]/g, '') || 0) * basePrice / 100);
            } else {
                calculatedTouristTaxRate = 0;
            }

            const calculatedTaxes = calculatedVatRate + calculatedTouristTaxRate;
            const calculatedTotalPrice = basePrice + calculatedServiceFee + cleaningFee + calculatedVatRate + calculatedTouristTaxRate;

            setServiceFee(calculatedServiceFee / 100);
            setTotalPrice((calculatedTotalPrice / 100));
            setCleaningFee(cleaningFee / 100);
            setTaxes(calculatedTaxes / 100);
        };

        calculateTotal();
    }, [accommodation, checkIn, checkOut]);


    const handleStartChat = () => {
        const recipientId = hostID;

        navigate(`/chat?recipient=${hostID}`);
    };

    const addUserToContactList = async () => {
        try {
            const uu_id = generateUUID();
            const response = await fetch('https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/AddUserToContactList', {
                method: 'POST',
                body: JSON.stringify({
                    ID: uu_id,
                    userID: userID,
                    hostID: hostID,
                    Status: 'pending',
                    AccoId: id
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch');
            }
            const data = await response.json();
            const body = JSON.parse(data.body);
            window.alert(body.message);
        } catch (error) {
            console.error("Unexpected error:", error);
        }
    }

    useEffect(() => {
        const totalGuests = adults + children + pets;
        setAmountOfGuest(totalGuests);
    }, [adults, children, pets]);

    const handleBooking = () => {
        const details = {
            id,
            checkIn,
            checkOut,
            adults,
            kids: children,
            pets,
            cleaningFee,
            amountOfGuest,
            taxes,
            ServiceFee
        };
        const queryString = new URLSearchParams(details).toString();
        navigate(`/bookingoverview?${queryString}`);
    };


    const renderCategories = () => {
        if (accommodation && accommodation.Features) {
            const items = accommodation.Features;
            const categoriesToShow = showAll ? Object.keys(items) : Object.keys(items).slice(0, 2);

            return categoriesToShow.map(category => {
                const uniqueItems = [...new Set(items[category])];
                if (uniqueItems.length > 0) {
                    return (
                        <div key={category} className='features-category'>
                            <h3>{category}</h3>
                            <ul>
                                {uniqueItems.map((feature, index) => (
                                    <li key={index} className='category-item'>

                                        {typeof featureIcons[feature] === 'string' ? (
                                            <img src={featureIcons[feature]} className='feature-icon'
                                                 alt={`${feature} icon`}/>
                                        ) : (
                                            featureIcons[feature] && React.isValidElement(featureIcons[feature]) ? (
                                                <span className='feature-icon'>{featureIcons[feature]}</span>
                                            ) : (
                                                <span>{feature}</span>
                                            )
                                        )}
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }
                return null;
            });
        }
        return null;
    };

    const isDateBooked = (date) => {
        const selectedDate = new Date(date);
        return bookedDates.some(bookedRange => {
            const start = new Date(bookedRange[0].S);
            const end = new Date(bookedRange[1].S);
            return selectedDate >= start && selectedDate <= end;
        });
    };

    const isDateAfterBookedNight = (date) => {
        const selectedDate = new Date(date);
        if (!checkIn) return false;

        return bookedDates.some(bookedRange => {
            const start = new Date(bookedRange[0].S);
            return selectedDate >= start && selectedDate >= checkIn;
        });
    };

    const isDateInRange = (date, startDate, endDate) => {
        const selectedDate = normalizeDate(new Date(date));
        const rangeStart = normalizeDate(new Date(startDate));
        const rangeEnd = normalizeDate(new Date(endDate));
        return rangeStart && rangeEnd && selectedDate >= rangeStart && selectedDate <= rangeEnd;
    };

    const filterBookedDates = (date) => {
        const selectedDate = normalizeDate(new Date(date));

        return bookedDates.some(bookedRange => {
            const start = new Date(bookedRange[0].S);
            const end = new Date(bookedRange[1].S);

            return selectedDate >= start && selectedDate <= end;
        });
    };

    const filterDisabledDays = (date) => {
        const selectedDate = new Date(date);

        return accommodation.DateRanges.every(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);

            return !(selectedDate >= start && selectedDate <= end);
        });
    };

    const renderStars = (review) => {
        if (review.rating) {
            const numStars = parseInt(review.rating);
            if (!isNaN(numStars)) {
                const stars = Array.from({length: numStars}, (_, index) => (
                    <span key={index}>★</span>
                ));
                return stars;
            } else {
                return <span>Rating: {review.rating}</span>;
            }
        } else {
            return <span>No rating available</span>;
        }
    };

    const filterAdvanceReservedDates = (date) => {
        const selectedDate = normalizeDate(new Date(date));
        const today = normalizeDate(new Date());

        const minAdvanceReservation = new Date();
        minAdvanceReservation.setDate(today.getDate() + accommodation.MinimumAdvanceReservation);
        minAdvanceReservation.setHours(0, 0, 0, 0);
        const maxAdvanceReservation = new Date();
        maxAdvanceReservation.setDate(today.getDate() + accommodation.MaximumAdvanceReservation);

        if (accommodation.MaximumAdvanceReservation === 0) {
            return selectedDate >= minAdvanceReservation;
        } else {
            return selectedDate >= minAdvanceReservation && selectedDate <= maxAdvanceReservation;
        }
    };

    useEffect(() => {
        const mergeDateRanges = (ranges) => {
            if (!ranges || ranges.length === 0) return [];

            const sortedRanges = ranges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            const mergedRanges = [];
            let currentRange = sortedRanges[0];

            for (let i = 1; i < sortedRanges.length; i++) {
                const range = sortedRanges[i];
                const currentEnd = new Date(currentRange.endDate);
                const nextStart = new Date(range.startDate);

                if (currentEnd >= nextStart || currentEnd.getTime() + 86400000 === nextStart.getTime()) {
                    currentRange.endDate = new Date(Math.max(new Date(currentRange.endDate), new Date(range.endDate)));
                } else {
                    mergedRanges.push(currentRange);
                    currentRange = range;
                }
            }

            // Push the last range
            mergedRanges.push(currentRange);
            return mergedRanges;
        };

        // Merge the date ranges from the accommodation
        if (accommodation?.DateRanges) {
            const mergedRanges = mergeDateRanges(accommodation.DateRanges);
            setAccommodation((prev) => ({
                ...prev,
                MergedDateRanges: mergedRanges,
            }));
        }
    }, [accommodation?.DateRanges]);

    const normalizeDate = (date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    };

    const combinedCheckInDateFilter = (date) => {
        const selectedDate = normalizeDate(new Date(date));
        const today = normalizeDate(new Date());

        const isInThePast = selectedDate < today;

        const isOutsideMergedRanges =
            accommodation?.MergedDateRanges &&
            accommodation.MergedDateRanges.every((range) => {
                const start = normalizeDate(new Date(range.startDate));
                const end = normalizeDate(new Date(range.endDate));
                return !(selectedDate >= start && selectedDate <= end);
            });

        const isBooked = filterBookedDates(date);
        const isAdvanceReserved = filterAdvanceReservedDates(date);

        return !isInThePast && !isOutsideMergedRanges && !isBooked && isAdvanceReserved;
    }

    const combinedCheckOutDateFilter = (date) => {
        const selectedDate = normalizeDate(new Date(date));
        const today = normalizeDate(new Date());

        const isInThePast = selectedDate < today;

        const isOutsideMergedRanges =
            accommodation?.MergedDateRanges &&
            accommodation.MergedDateRanges.every((range) => {
                const start = normalizeDate(new Date(range.startDate));
                const end = normalizeDate(new Date(range.endDate));
                return !(selectedDate >= start && selectedDate <= end);
            });

        const isBooked = filterBookedDates(date);

        return !isInThePast && !isOutsideMergedRanges && !isBooked;
    }

    return (
        <main className="container">
            <section className="detailContainer">
                <section className='detailInfo'>
                    {accommodation && (
                        <div>
                            <div>
                                <Link to="/home">
                                    <p className="backButton">Go Back</p>
                                </Link>
                                <h1 className='accommodationTitle'>
                                    {accommodation.Title} 
                                    {isDemo && " *"}
                                </h1>
                            </div>
                            <div>
                                <ImageGallery images={Object.values(accommodation.Images)}/>
                            </div>
                            <div className="roomInformation">

                                <p className='details'>
                                    <p className="placeName">{accommodation.City}, {accommodation.Country} </p>
                                     {`€ ${accommodation.Rent} ${accommodation.AccommodationType === 'Boat' ? 'per day' : 'per night'} • ${accommodation.GuestAmount} guests • 
                                    ${accommodation.Beds} beds • 
                                    ${accommodation.Bedrooms} bedrooms • ${accommodation.Bathrooms} bathrooms`}
                                </p>
                            </div>
                            <p className='description'>{accommodation.Description}</p>
                            <div>
                                <hr className="pageDividerr"/>
                                <h3>Calendar overview:</h3>
                                {/* <BookingCalendar passedProp={accommodation} checkIn={checkIn} checkOut={checkOut}/> */}

                                <BookingCalendar
                                passedProp={accommodation}
                                checkIn={checkIn}
                                checkOut={checkOut}
                                onCheckInChange={handleCheckInChange}
                                onCheckOutChange={handleCheckOutChange}
                                checkInFilter={combinedCheckInDateFilter}
                                checkOutFilter={combinedCheckOutDateFilter}
                            />
                            </div>
                            <div>
                            <hr className="pageDividerr" />
                            <h3 className="houseRulesTitle">House rules</h3>
                            <p className="houseRulesDetails">
                                {accommodation.AllowParties ? 'Parties Allowed' : 'No Parties'} • {accommodation.AllowPets ? 'Pets Allowed' : 'No Pets'} • {accommodation.AllowSmoking ? 'Smoking Allowed' : 'No Smoking'}
                            </p>
                            <div className="checkInCheckOut">
                                <div className="checkIn">Check-in From: {accommodation.CheckIn?.From} To: {accommodation.CheckIn?.Til}</div>
                                <div className="checkOut">Check-out From: {accommodation.CheckOut?.From} To: {accommodation.CheckOut?.Til}</div>
                            </div>
                        </div>

                            <div>
                                <hr className="pageDividerr"/>
                                <h3>This place offers the following:</h3>
                                {accommodation ? renderCategories() : ''}
                                <div>
                                    {Object.keys(accommodation.Features).length > 2 && (
                                        <button className='showMore' onClick={toggleModal}>
                                            Show more
                                        </button>
                                    )}
                                </div>

                                {showModal && (
                                    <FeaturePopup features={accommodation.Features} onClose={toggleModal}/>
                                )}

                                <section className="listing-host-info">
                                    {/* <h2>Host profile</h2> */}
                                    {host && (
                                        <div className="host-card">
                                            <section className="card-top">
                                                <h3>{getHostName(host)}</h3>
                                                <p>Joined on: {dateFormatterDD_MM_YYYY(host.UserCreateDate)}</p>
                                            </section>
                                            <section className="card-bottom">
                                                <div>
                                                    <button className='hostButton'>Contact host</button>
                                                </div>
                                            </section>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}
                </section>

                {accommodation && (
                        <aside className='detailSummary'>
                            <div className="summary-section">
                                <h2 className='price-per-night'>
                                    €{accommodation.Rent} {accommodation.Type === "Boat" ? "per day" : "per night"}
                                </h2>


                                <div className="dates" style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <div className="summaryBlock dateInput"
                                         style={{flex: '1', position: 'relative', marginRight: '10px'}}>
                                        <label htmlFor="checkIn">Check In</label>
                                        <DatePicker
                                            id="checkIn"
                                            selected={checkIn}
                                            className='datePickerLD'
                                            onChange={(date) => setCheckIn(date)}
                                            minDate={minStart && new Date(minStart)}
                                            maxDate={maxStart && new Date(maxStart)}
                                            filterDate={combinedCheckInDateFilter}
                                            dateFormat="yyyy-MM-dd"
                                            placeholderText="DD/MM/YYYY"
                                        />
                                        {checkIn && <FaTimes className="clear-button" onClick={() => setCheckIn(null)}
                                                             style={{
                                                                 position: 'absolute',
                                                                 right: '10px',
                                                                 top: '50%',
                                                                 cursor: 'pointer'
                                                             }}/>}
                                    </div>
                                    <div className="summaryBlock dateInput" style={{flex: '1', position: 'relative'}}>
                                        <label htmlFor="checkOut">Check Out</label>
                                        <DatePicker
                                            id="checkOut"
                                            selected={checkOut}
                                            className="datePickerLD"
                                            onChange={(date) => setCheckOut(date)}
                                            minDate={
                                                checkIn
                                                    ? accommodation.MinimumStay > 0
                                                        ? new Date(checkIn.getTime() + accommodation.MinimumStay * 24 * 60 * 60 * 1000)
                                                        : minEnd && new Date(minEnd)
                                                    : minEnd && new Date(minEnd)
                                            }
                                            maxDate={
                                                checkIn
                                                    ? accommodation.MaximumStay > 0
                                                        ? new Date(checkIn.getTime() + accommodation.MaximumStay * 24 * 60 * 60 * 1000)
                                                        : maxEnd && new Date(maxEnd)
                                                    : maxEnd && new Date(maxEnd)
                                            }
                                            filterDate={(date) => {
                                                if (checkIn) {
                                                    return combinedCheckOutDateFilter(date);
                                                } else {
                                                    return combinedCheckInDateFilter(date);
                                                }
                                            }}
                                            dateFormat="yyyy-MM-dd"
                                            placeholderText="DD/MM/YYYY"
                                        />
                                        {checkOut && <FaTimes className="clear-button" onClick={() => setCheckOut(null)}
                                                              style={{
                                                                  position: 'absolute',
                                                                  right: '10px',
                                                                  top: '50%',
                                                                  cursor: 'pointer'
                                                              }}/>}
                                    </div>
                                </div>

                                {/* Guest Popup */}
                                <div className="guests">
                                    <div className="dropdown">
                                        <label>Guests</label>
                                        <div
                                            className="dropdown-button"
                                            onClick={toggleDropdown}
                                        >
                                            {guestSummary} {showGuestPopup ? '▲' : '▼'}
                                        </div>
                                        {showGuestPopup && (
                                            <div ref={popupRef} className="dropdown-content">
                                                <div className="counter">
                                                    <span>Adults</span>
                                                    <div className="button__box">
                                                        <button
                                                            onClick={() => setAdults(Math.max(adults - 1, 0))}
                                                            disabled={adults <= 0}
                                                        >
                                                            -
                                                        </button>
                                                        <div className="label__text">{adults}</div>
                                                        <button
                                                            onClick={() => {
                                                                if (adults + children + pets < accommodation.GuestAmount) {
                                                                    setAdults(adults + 1);
                                                                }
                                                            }}
                                                            disabled={adults + children + pets >= accommodation.GuestAmount}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="counter">
                                                    <span>Children</span>
                                                    <div className="button__box">
                                                        <button onClick={() => setChildren(Math.max(children - 1, 0))}>-
                                                        </button>
                                                        {children}
                                                        <button onClick={() => setChildren(children + 1)}>+</button>
                                                    </div>
                                                </div>
                                                <div className="counter">
                                                    <span>Pets</span>
                                                    <div className="button__box">
                                                        <button onClick={() => setPets(Math.max(pets - 1, 0))}>-</button>
                                                        {pets}
                                                        <button onClick={() => setPets(pets + 1)}>+</button>
                                                    </div>
                                                </div>
                                                <div className="closeButtonContainer">
                                                    <p onClick={() => setShowGuestPopup(false)}
                                                       className="closeButton">Close</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p>Maximum amount of guests: {accommodation.GuestAmount}</p>
                                </div>


                                {/* Price and Reserve Section */}
                                <button className="reserve-button" onClick={handleBooking}>Reserve</button>
                                {/* {isDemo ? (
                                    <p className="disclaimer">*This is a demo post and not bookable</p>
                                ) : (
                                    <p className="disclaimer">*You won't be charged yet</p>
                                )} */}
                                {(checkIn && checkOut) ? (
                                    <div className="price-details">
                                        <div className="price-item">
                                            <p>{(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)} nights x
                                                €{accommodation.Rent} a night</p>
                                            <p>€{(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24) * accommodation.Rent}</p>
                                        </div>
                                        <div className="price-item">
                                            <p>Cleaning fee</p>
                                            <p>&euro;{cleaningFee}</p>
                                        </div>
                                        <div className="price-item">
                                            <p>Domits service fee</p>
                                            <p>€{ServiceFee.toFixed(2)}</p>
                                        </div>
                                        <div className="price-item">
                                            <p>Taxes</p>
                                            <p>€{taxes.toFixed(2)}</p>
                                        </div>
                                        <div className="total">
                                            <p>Total</p>
                                            <p>€{totalPrice.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>Please choose your Check-in date and Check-out date</div>
                                )}
                            </div>
                        </aside>
                )}
            </section>
        </main>
    );
}

export default ListingDetails;
