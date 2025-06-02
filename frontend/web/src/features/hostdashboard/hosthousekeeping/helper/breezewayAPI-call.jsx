import axios from "axios";

// const breezewayAPI = axios.create({
//   baseURL: "https://api.breezeway.io",
//   headers: {
//     // "Authorization": `Bearer YOUR_API_KEY`,
//     "Content-Type": "application/json"
//   }
// });

const breezewayAPI = {
    get: async(endpoint) => {
        return { data: [] };
    }
};

export const getTasks = async () => {
  try {
    const response = await breezewayAPI.get("/tasks");
    return response.data;
  } catch (error) {
    console.error("Error fetching Breezeway tasks:", error);
  }
};
