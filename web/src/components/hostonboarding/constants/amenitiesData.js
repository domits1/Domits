export const allAmenities = {
    Essentials: [
        'Wi-Fi',
        'Air conditioning',
        'Heating',
        'TV with cable/satellite',
        'Hot water',
        'Towels',
        'Bed linens',
        'Extra pillows and blankets',
        'Toilet paper',
        'Soap and shampoo',
    ],
    Kitchen: [
        'Refrigerator',
        'Microwave',
        'Oven',
        'Stove',
        'Dishwasher',
        'Coffee maker',
        'Toaster',
        'Basic cooking essentials',
        'Dishes and silverware',
        'Glasses and mugs',
        'Cutting board and knives',
        'Blender',
        'Kettle',
    ],
    Bathroom: [
        'Hair dryer',
        'Shower gel',
        'Conditioner',
        'Body lotion',
        'First aid kit',
    ],
    Bedroom: [
        'Hangers',
        'Iron and ironing board',
        'Closet/drawers',
        'Alarm clock',
    ],
    LivingArea: [
        'Sofa',
        'Armchairs',
        'Coffee table',
        'Books and magazines',
        'Board games',
    ],
    Technology: [
        'Smart TV',
        'Streaming services',
        'Bluetooth speaker',
        'Universal chargers',
        'Work desk and chair',
    ],
    Safety: [
        'Smoke detector',
        'Carbon monoxide detector',
        'Fire extinguisher',
        'Lock on bedroom door',
    ],
    FamilyFriendly: [
        'High chair',
        'Crib',
        'Children’s books and toys',
        'Baby safety gates',
        'Baby bath',
        'Baby monitor',
    ],
    Laundry: [
        'Washer and dryer',
        'Laundry detergent',
        'Clothes drying rack',
    ],
    Convenience: [
        'Keyless entry',
        'Self-check-in',
        'Local maps and guides',
        'Luggage drop-off allowed',
        'Parking space',
        'EV charger',
    ],
    Accessibility: [
        'Step-free access',
        'Wide doorways',
        'Accessible-height bed',
        'Accessible-height toilet',
        'Shower chair',
    ],
    ExtraServices: [
        'Cleaning service (add service fee manually)',
        'Concierge service',
        'Housekeeping',
        'Grocery delivery',
        'Airport shuttle',
        'Private chef',
        'Personal trainer',
        'Massage therapist',
    ],
    EcoFriendly: [
        'Recycling bins',
        'Energy-efficient appliances',
        'Solar panels',
        'Composting bin',
    ],
    Outdoor: [
        'Patio or balcony',
        'Outdoor furniture',
        'Grill',
        'Fire pit',
        'Pool',
        'Hot tub',
        'Garden or backyard',
        'Bicycle',
    ],
};

export const amenities = {
    allAmenities,
    boatAmenities: {
        ...allAmenities,
        Outdoor: [
            ...allAmenities.Outdoor,
            'Bimini',
            'Outdoor shower',
            'External table',
            'External speakers',
            'Teak deck',
            'Bow sundeck',
            'Aft sundeck',
            'Bathing Platform',
            'Bathing ladder',
        ],
        NavigationalEquipment: [
            'Bow thruster',
            'Electric windlass',
            'Autopilot',
            'GPS',
            'Depth sounder',
            'VHF',
            'Guides & Maps',
        ],
        LeisureActivities: [
            'Snorkeling equipment',
            'Fishing equipment',
            'Diving equipment',
        ],
        WaterSports: [
            'Water skis',
            'Monoski',
            'Wakeboard',
            'Towable Tube',
            'Inflatable banana',
            'Kneeboard',
        ],
    },
    camperAmenities: {
        ...allAmenities,
        FamilyFriendly: [...allAmenities.FamilyFriendly, 'Baby seat'],
        Outdoor: [
            ...allAmenities.Outdoor,
            'Outdoor shower',
            'External table and chairs',
            'External speakers',
        ],
        Vehicle: [
            'Bicycle carrier',
            'Reversing camera',
            'Airbags',
            'Cruise control',
            'Imperial',
            'Navigation',
            'Awning',
            'Parking sensors',
            'Power steering',
            'Tow bar',
            'Snow chains',
            'Winter tires',
        ],
    },
};