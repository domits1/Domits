
import MList from "./mlist";

const ADashboard = () => {
    const list = [
        { title: 'Manage Admins ',           id: 1  },
        { title: 'Manage Guests ',           id: 2  },
        { title: 'Manage Hosts ',            id: 3  },
        { title: 'Manage Company ',          id: 4  },
        { title: 'Manage Documents ',        id: 5  },
        { title: 'Manage Hosts ',            id: 6  },
        { title: 'Manage Services ',         id: 7  },
        { title: 'Manage Help ',             id: 8  },
        { title: 'Manage Locations ',        id: 9  },
        { title: 'Manage Map ',              id: 10 },
        { title: 'Manage Fare ',             id: 11 },
        { title: 'Manage Requests',          id: 12 },
        { title: 'Manage Bookings',          id: 13 },
        { title: 'Manage Ratings',           id: 14 },
        { title: 'Manage Referals',          id: 15 },
        { title: 'Manage Payout ',           id: 16 },
        { title: "Manage Wallet & Promo's ", id: 17 },
        { title: 'Manage App Version ',      id: 18 },
        { title: 'Manage Settings ',         id: 19 },
        { title: 'Manage Web Language',      id: 20 },
        { title: 'Manage App Language',      id: 21 },
    ];
    
    return ( 
        <div className="aDash">
            <MList list={list}/>
        </div>
    );
}
 
export default ADashboard;
