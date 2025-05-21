import RetrieveAccessToken from "../../features/auth/RetrieveAccessToken";

async function GetWishlist() {
    try {
        const response = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
            method: "GET",
            headers: {
                Authorization: await RetrieveAccessToken()
            }
        })
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

export default GetWishlist;
