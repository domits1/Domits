import RetrieveAccessToken from "../../features/auth/RetrieveAccessToken";

async function AddToWishlist(id) {
    try {
        const response = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
            method: "POST",
            headers: {
                Authorization: await RetrieveAccessToken()
            },
            body: JSON.stringify({accommodationId: id})
        })
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

export default AddToWishlist;
