const fetchProperties = async () => {
    try {
      const response = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=e2ef4793-7376-458b-b4e5-7eba2a9deb79,824837e0-3f4a-4c24-99c8-b922987514ee,e03094c4-a702-4f65-a22b-c80bea7a2e1b,6637379f-efe4-4a13-b3ec-092f2dacee70,606519ba-89a4-4e52-a940-3e4f79dabdd7,3e6f119c-4c91-4969-b845-7093d03b9575,bf3ecb5f-2106-45e6-a054-c28f3dd91638,e65ceab8-f77e-4d6f-b1f3-198f41b47f3e,a9bba419-5e1b-4d4a-b86d-1e22c57ca24e,00a5a252-09d4-4527-bf7c-a309fc879242"
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.dir(data, { depth: null });
  
    } catch (err) {
      console.error("❌ Error:", err.message);
    }
  };
  
  fetchProperties();
  