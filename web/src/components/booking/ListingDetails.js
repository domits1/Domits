import React, {useState, useEffect, useRef} from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./listing.css";
import ImageGallery from './ImageGallery';
import DateFormatterYYYY_MM_DD from "../utils/DateFormatterYYYY_MM_DD";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Washingmashine from "../../images/icons/Washingmachine.png";
import Television from "../../images/icons/Television.png";
import Smokedetector from "../../images/icons/Smokedetector.png";
import Wifi from "../../images/icons/Wifi.png";
import Homeoffice from "../../images/icons/Homeoffice.png";
import Fireextinguisher from "../../images/icons/Fireextinguisher.png";
import Airconditioning from "../../images/icons/Airconditioning.png";
import FirstAidKit from "../../images/icons/FirstAidKit.png";
import Kitchen from "../../images/icons/Kitchen.png";
import Onsiteparking from "../../images/icons/Onsiteparking.png";
import dateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import Armchair from "../../images/armchair.png";
import BabyMonitor from "../../images/baby-monitor.png";
import Baby from "../../images/baby.png";
import Backyard from "../../images/backyard.png";
import Blender from "../../images/blender.png";
import BoardGame from "../../images/board-game.png";
import Bus from "../../images/bus.png";
import Car from "../../images/car.png";
import ChargingStation from "../../images/charging-station.png";
import CheckIn from "../../images/check-in.png";
import Cleaner from "../../images/cleaner.png";
import Clothes from "../../images/clothes.png";
import CoffeeTable from "../../images/coffee-table.png";
import Crib from "../../images/crib.png";
import Dishwasher from "../../images/dishwasher.png";
import Food from "../../images/food.png";
import Gate from "../../images/gate.png";
import GraphicDesign from "../../images/graphic-design.png";
import Grill from "../../images/grill.png";
import HighChair from "../../images/high-chair.png";
import HotTub from "../../images/hot-tub.png";
import CoffeeMachine from "../../images/coffee-machine.png";
import AlarmClock from "../../images/alarm-clock.png";
import AntiqueBalcony from "../../images/antique-balcony.png";
import BookingCalendar from "./BookingCalendar";
import {Auth} from "aws-amplify";
import { FaTimes } from 'react-icons/fa';
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
import ChildFriendlyIcon from '@mui/icons-material/ChildFriendly';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import GrassIcon from '@mui/icons-material/Grass';
import BlenderIcon from '@mui/icons-material/Blender';
import ExtensionIcon from '@mui/icons-material/Extension';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ChargingStationIcon from '@mui/icons-material/ChargingStation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import TableBarIcon from '@mui/icons-material/TableBar';
import CribIcon from '@mui/icons-material/Crib';

import FastfoodIcon from '@mui/icons-material/Fastfood';
import FenceIcon from '@mui/icons-material/Fence';

import OutdoorGrillIcon from '@mui/icons-material/OutdoorGrill';

import HotTubIcon from '@mui/icons-material/HotTub';
import CoffeeMakerIcon from '@mui/icons-material/CoffeeMaker';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import BalconyIcon from '@mui/icons-material/Balcony';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';


const ListingDetails = () => {
    const navigate = useNavigate();
    const {search} = useLocation();
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
    const [serviceFee, setServiceFee] = useState(0);
    const [cleaningFee, setCleaningFee] = useState(0);
    const [hostID, setHostID] = useState();
    const [showAll, setShowAll] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [userID, setUserID] = useState('');
    const [showTravelerPopup, setShowTravelerPopup] = useState(false);
    const travelerSummary = `${adults} Adult${adults > 1 ? 's' : ''}, ${children} Child${children !== 1 ? 'ren' : ''}, ${pets} Pet${pets > 1 ? 's' : ''}`;
    const popupRef = useRef(null);

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const featureIcons = {
        // Essentials
        'Wi-Fi': <WifiIcon />,
        'Air conditioning': <AcUnitIcon />,
        'Heating': <AcUnitIcon />, // Gebruik AC-icoon voor verwarming
        'TV with cable/satellite': <TvIcon />,
        'Hot water': <AcUnitIcon />, // Placeholder voor Hot water
        'Towels': <CheckroomIcon />,
        'Bed linens': <CheckroomIcon />,
        'Extra pillows and blankets': <CheckroomIcon />,
        'Toilet paper': <CheckroomIcon />,
        'Soap and shampoo': <CheckroomIcon />,

        // Kitchen
        'Refrigerator': <KitchenIcon />,
        'Microwave': <KitchenIcon />, // Gebruik KitchenIcon voor alle keukenitems
        'Oven': <KitchenIcon />,
        'Stove': <KitchenIcon />,
        'Dishwasher': Dishwasher,
        'Coffee maker': <CoffeeMakerIcon />,
        'Toaster': <KitchenIcon />,
        'Basic cooking essentials': <KitchenIcon />,
        'Dishes and silverware': <KitchenIcon />,
        'Glasses and mugs': <KitchenIcon />,
        'Cutting board and knives': <KitchenIcon />,
        'Blender': <BlenderIcon />,
        'Kettle': <KitchenIcon />,

        // Bathroom
        'Hair dryer': <KitchenIcon />, // Placeholder
        'Shower gel': <MedicalServicesIcon />, // Placeholder
        'Conditioner': <MedicalServicesIcon />,
        'Body lotion': <MedicalServicesIcon />,
        'First aid kit': <MedicalServicesIcon />,

        // Bedroom
        'Hangers': <CheckroomIcon />,
        'Iron and ironing board': <CheckroomIcon />,
        'Closet/drawers': <CheckroomIcon />,
        'Alarm clock': <AccessAlarmIcon />,

        // LivingArea
        'Sofa': <ChairIcon />, // Placeholder
        'Armchairs': <ChairIcon />,
        'Coffee table': <TableBarIcon />,
        'Books and magazines': <ExtensionIcon />, // Placeholder voor boeken
        'Board games': <ExtensionOutlinedIcon />,

        // Technology
        'Smart TV': <TvIcon />,
        'Streaming services': <TvIcon />,
        'Bluetooth speaker': <TvIcon />,
        'Universal chargers': <TvIcon />, // Placeholder
        'Work desk and chair': <DeskIcon />,

        // Safety
        'Smoke detector': <RadarIcon />,
        'Carbon monoxide detector': <RadarIcon />,
        'Fire extinguisher': <FireExtinguisherIcon />,
        'Lock on bedroom door': <CheckCircleIcon />, // Placeholder

        // FamilyFriendly
        'High chair': HighChair,
        'Crib': <CribIcon />,
        'Children’s books and toys': <ChildCareIcon />,
        'Baby safety gates': <ChildCareIcon />,
        'Baby bath': <ChildCareIcon />,
        'Baby monitor': <ChildFriendlyIcon />,

        // Laundry
        'Washer and dryer': <LocalLaundryServiceIcon />,
        'Laundry detergent': <LocalLaundryServiceIcon />,
        'Clothes drying rack': <LocalLaundryServiceIcon />,

        // Convenience
        'Keyless entry': <CheckCircleIcon />,
        'Self-check-in': <CheckCircleIcon />,
        'Local maps and guides': <CheckCircleIcon />,
        'Luggage drop-off allowed': <CheckCircleIcon />,
        'Parking space': <LocalParkingIcon />,
        'EV charger': <ChargingStationIcon />,

        // Accessibility
        'Step-free access': <CheckCircleIcon />, // Placeholder
        'Wide doorways': <CheckCircleIcon />, // Placeholder
        'Accessible-height bed': <CheckCircleIcon />, // Placeholder
        'Accessible-height toilet': <CheckCircleIcon />, // Placeholder
        'Shower chair': <CheckCircleIcon />, // Placeholder

        // ExtraServices
        'Cleaning service (add service fee manually)': <CleaningServicesIcon />,
        'Concierge service': <CleaningServicesIcon />,
        'Housekeeping': <CleaningServicesIcon />,
        'Grocery delivery': <CleaningServicesIcon />, // Placeholder
        'Airport shuttle': <DirectionsBusIcon />,
        'Private chef': <FastfoodIcon />,
        'Personal trainer': <FastfoodIcon />, // Placeholder
        'Massage therapist': <FastfoodIcon />, // Placeholder

        // EcoFriendly
        'Recycling bins': <CheckCircleIcon />, // Placeholder
        'Energy-efficient appliances': <CheckCircleIcon />, // Placeholder
        'Solar panels': <CheckCircleIcon />, // Placeholder
        'Composting bin': <CheckCircleIcon />, // Placeholder

        // Outdoor
        'Patio or balcony': <BalconyIcon />,
        'Outdoor furniture': <OutdoorGrillIcon />,
        'Grill': <OutdoorGrillIcon />,
        'Fire pit': <OutdoorGrillIcon />, // Placeholder
        'Pool': <HotTubIcon />,
        'Hot tub': <HotTubIcon />,
        'Garden or backyard': <GrassIcon />,
        'Bicycle': <OutdoorGrillIcon />, // Placeholder

        // Boat-specific
        'Bimini': <OutdoorGrillIcon />, // Placeholder
        'Outdoor shower': <OutdoorGrillIcon />,
        'External table': <OutdoorGrillIcon />,
        'External speakers': <OutdoorGrillIcon />,
        'Teak deck': <OutdoorGrillIcon />,
        'Bow sundeck': <OutdoorGrillIcon />,
        'Aft sundeck': <OutdoorGrillIcon />,
        'Bathing Platform': <OutdoorGrillIcon />,
        'Bathing ladder': <OutdoorGrillIcon />,

        // NavigationalEquipment
        'Bow thruster': <OutdoorGrillIcon />, // Placeholder
        'Electric windlass': <OutdoorGrillIcon />,
        'Autopilot': <OutdoorGrillIcon />,
        'GPS': <OutdoorGrillIcon />,
        'Depth sounder': <OutdoorGrillIcon />,
        'VHF': <OutdoorGrillIcon />,
        'Guides & Maps': <OutdoorGrillIcon />,

        // LeisureActivities
        'Snorkeling equipment': <ExtensionIcon />, // Placeholder
        'Fishing equipment': <ExtensionIcon />,
        'Diving equipment': <ExtensionIcon />,

        // WaterSports
        'Water skis': <ExtensionIcon />, // Placeholder
        'Monoski': <ExtensionIcon />,
        'Wakeboard': <ExtensionIcon />,
        'Towable Tube': <ExtensionIcon />,
        'Inflatable banana': <ExtensionIcon />,
        'Kneeboard': <ExtensionIcon />,

        // Camper-specific
        'Baby seat': <ChildCareIcon />,
        'Bicycle carrier': <DirectionsCarIcon />, // Placeholder
        'Reversing camera': <DirectionsCarIcon />,
        'Airbags': <DirectionsCarIcon />,
        'Cruise control': <DirectionsCarIcon />,
        'Imperial': <DirectionsCarIcon />, // Placeholder
        'Navigation': <DirectionsCarIcon />,
        'Awning': <DirectionsCarIcon />,
        'Parking sensors': <DirectionsCarIcon />,
        'Power steering': <DirectionsCarIcon />,
        'Tow bar': <DirectionsCarIcon />,
        'Snow chains': <DirectionsCarIcon />,
        'Winter tires': <DirectionsCarIcon />
    };


    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowTravelerPopup(false);
            }
        }

        if (showTravelerPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTravelerPopup]);

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
        setShowTravelerPopup(!showTravelerPopup);
    };

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    const FeaturePopup = ({ features, onClose }) => {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <button className="close-button" onClick={onClose}>✖</button>
                    <h2>What does this place have to offer?</h2>
                    {Object.keys(features).map(category => {
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
                                                    <img src={featureIcons[item]} className='feature-icon' alt={`${item} icon`} />
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
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
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
                setAccommodation(data);
                setDates(data.StartDate, data.EndDate, data.BookedDates || []); // Pass the booked dates
                fetchHostInfo(data.OwnerId);
                setHostID(data.OwnerId)
                fetchReviewsByAccommodation(data.ID);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };

        fetchAccommodation();
    }, [id]);

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
            const calculatedTotalPrice = basePrice + calculatedServiceFee + cleaningFee;

            setServiceFee(calculatedServiceFee / 100);
            setTotalPrice(calculatedTotalPrice / 100);
            setCleaningFee(cleaningFee / 100);
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

    const handleBooking = () => {
        const details = {
            id,
            checkIn,
            checkOut,
            adults,
            kids: children,
            pets,
            cleaningFee
        };
        const queryString = new URLSearchParams(details).toString();
        navigate(`/bookingoverview?${queryString}`);
    };


    const renderCategories = () => {
        if (accommodation && accommodation.Features) {
            const items = accommodation.Features;
            const categoriesToShow = showAll ? Object.keys(items) : Object.keys(items).slice(0, 2);

            return categoriesToShow.map(category => {
                const uniqueItems = [...new Set(items[category])]; // Zorg dat items uniek zijn
                if (uniqueItems.length > 0) {
                    return (
                        <div key={category} className='features-category'>
                            <h3>{category}</h3>
                            <ul>
                                {uniqueItems.map((feature, index) => (
                                    <li key={index} className='category-item'>

                                        {typeof featureIcons[feature] === 'string' ? (
                                            <img src={featureIcons[feature]} className='feature-icon' alt={`${feature} icon`} />
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
        return bookedDates.some(bookedRange => {
            const start = new Date(bookedRange[0]);
            const end = new Date(bookedRange[1]);
            const selectedDate = new Date(date);
            return selectedDate >= start && selectedDate <= end;
        });
    };

    const isDateAfterBookedNight = (date) => {
        const selectedDate = new Date(date);
        if (!checkIn) return false;

        for (let bookedRange of bookedDates) {
            const start = new Date(bookedRange[0]);
            if (checkIn <= start && selectedDate >= start) {
                return true;
            }
        }
        return false;
    };

    const isDateInRange = (date, startDate, endDate) => {
        const selectedDate = new Date(date);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        return rangeStart && rangeEnd && selectedDate >= rangeStart && selectedDate <= rangeEnd;
    };

    const filterBookedDates = (date) => {
        return !isDateBooked(date) && !isDateAfterBookedNight(date);
    };

    const filterDisabledDays = (date) => {
        for (let i = 0; i < accommodation.DateRanges.length; i++) {
            let index = accommodation.DateRanges[i];
            if (isDateInRange(new Date(date), new Date(index.startDate), new Date(index.endDate))) {
                return true;
            }
        }
        return false;
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


    return (
        <main className="container">
            <section className="detailContainer">
                <section className='detailInfo'>
                    {accommodation && (
                        <div>
                            <div>
                                <Link to="/">
                                    <p className="backButton">Go Back</p>
                                </Link>
                                <h1>
                                {accommodation.Title} {isDemo && "(DEMO)"}
                                </h1>
                            </div>
                            <div>
                                <ImageGallery images={Object.values(accommodation.Images)}/>
                            </div>
                            <div className="roomInformation">

                                <p className='details'>
                                    <p className="placeName">{accommodation.City}, {accommodation.Country} </p>
                                    {`€ ${accommodation.Rent} per night • ${accommodation.GuestAmount} guests • 
                                    ${accommodation.Beds} beds • 
                                    ${accommodation.Bedrooms} bedrooms • ${accommodation.Bathrooms} bathrooms`}
                                </p>
                            </div>
                            <p className='description'>{accommodation.Description}</p>
                            <div>
                                <hr className="pageDividerr" />
                                <h3>Calendar overview:</h3>
                                <BookingCalendar passedProp={accommodation} checkIn={checkIn} checkOut={checkOut}/>
                            </div>
                            <div>
                                <hr className="pageDividerr" />
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
                                    <FeaturePopup features={accommodation.Features} onClose={toggleModal} />
                                )}

                                {/*<section className="listing-reviews">*/}
                                {/*    <hr className="pageDividerr" />*/}
                                {/*    <h2>Reviews</h2>*/}
                                {/*    {reviews.length > 0 ? (*/}
                                {/*        reviews.map((review, index) => (*/}
                                {/*            <div key={index} className="review-card">*/}
                                {/*                <div className="stars-div">*/}
                                {/*                    {renderStars(review)}*/}
                                {/*                </div>*/}
                                {/*                <h2 className="review-header">{review.title}</h2>*/}
                                {/*                <p className="review-content">{review.content}</p>*/}
                                {/*                <p className="review-date">Written*/}
                                {/*                    on: {dateFormatterDD_MM_YYYY(review.date)} by {review.usernameFrom}</p>*/}
                                {/*            </div>*/}
                                {/*        ))*/}
                                {/*    ) : (*/}
                                {/*        <p className="review-alert">This accommodation does not have any reviews*/}
                                {/*            yet...</p>*/}
                                {/*    )}*/}
                                {/*    <div style={{*/}
                                {/*        display: 'flex',*/}
                                {/*        flexDirection: 'row',*/}
                                {/*        justifyContent: 'flex-start',*/}
                                {/*        gap: '2rem'*/}
                                {/*    }}>*/}
                                {/*        <button className='backButton'>Show more</button>*/}
                                {/*        <button className='backButton'*/}
                                {/*                onClick={addUserToContactList}*/}
                                {/*                style={{*/}
                                {/*                    backgroundColor: !userID ? 'gray' : '',*/}
                                {/*                    cursor: !userID ? 'not-allowed' : 'pointer'*/}
                                {/*                }}*/}
                                {/*                disabled={!userID}*/}
                                {/*        >Add to contact list*/}
                                {/*        </button>*/}
                                {/*    </div>*/}
                                {/*</section>*/}

                                <section className="listing-host-info">
                                    <h2>Host profile</h2>
                                    {host && (
                                        <div className="host-card">
                                            <section className="card-top">
                                                <h3>{getHostName(host)}</h3>
                                                <p>Joined on: {dateFormatterDD_MM_YYYY(host.UserCreateDate)}</p>
                                            </section>
                                            <section className="card-bottom">
                                                <div>
                                                    <button className='button'>Contact host</button>
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
                                {checkIn && checkOut && (
                                    <div className="nights">
                                        <p className="amountNights">{Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} night(s)</p>
                                    </div>
                                )}
                            <h2>Booking details</h2>
                            <p>Available from {DateFormatterDD_MM_YYYY(accommodation.DateRanges[0].startDate) + ' '}
                                to {DateFormatterDD_MM_YYYY(accommodation.DateRanges[accommodation.DateRanges.length - 1].endDate)}</p>
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
                                        filterDate={filterDisabledDays || filterBookedDates}
                                        dateFormat="yyyy-MM-dd"
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
                                        className='datePickerLD'
                                        onChange={(date) => setCheckOut(date)}
                                        minDate={minEnd && new Date(minEnd)}
                                        maxDate={maxEnd && new Date(maxEnd)}
                                        filterDate={filterDisabledDays || filterBookedDates}
                                        dateFormat="yyyy-MM-dd"
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

                            {/* Travelers Popup */}
                            <div className="travelers">
                                <div className="dropdown">
                                    <label>Travelers</label>
                                    <div
                                        className="dropdown-button"
                                        onClick={toggleDropdown}
                                    >
                                        {travelerSummary} {showTravelerPopup ? '▲' : '▼'}
                                    </div>
                                    {showTravelerPopup && (
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
                                                <div className= "button__box">
                                                <button onClick={() => setChildren(Math.max(children - 1, 0))}>-</button>
                                                {children}
                                                <button onClick={() => setChildren(children + 1)}>+</button>
                                                </div>
                                            </div>
                                            <div className="counter">
                                                <span>Pets</span>
                                                <div className= "button__box">
                                                <button onClick={() => setPets(Math.max(pets - 1, 0))}>-</button>
                                                {pets}
                                                <button onClick={() => setPets(pets + 1)}>+</button>
                                                </div>
                                            </div>
                                            <div className="closeButtonContainer">
                                                <p onClick={() => setShowTravelerPopup(false)} className="closeButton">Close</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p>Maximum amount of travelers: {accommodation.GuestAmount}</p>
                            </div>


                            {/* Price and Reserve Section */}
                            <button className="reserve-button" onClick={handleBooking}
                                    disabled={!isFormValid || isDemo}
                                    style={{
                                        backgroundColor: isFormValid ? 'green' : 'green',
                                        cursor: isFormValid && !isDemo ? 'pointer' : 'not-allowed',
                                        opacity: isFormValid && !isDemo ? 1 : 0.5
                                    }}>
                                Reserve
                            </button>
                            {isDemo ? (
                                <p className="disclaimer">*This is a demo post and not bookable</p>
                            ) : (
                                <p className="disclaimer">*You won't be charged yet</p>
                            )}
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
                                        <p>€{serviceFee.toFixed(2)}</p>
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
