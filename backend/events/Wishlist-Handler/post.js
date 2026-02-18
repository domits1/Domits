import { handler } from "../../functions/Wishlist-Handler/index.js";
import { getHostAuthToken } from "../../test/util/getHostAuthToken.js";

async function post() {
  console.log(
    await handler({
      httpMethod: "PUT",
      path: "/wishlist",
      resource: "/wishlist",
      headers: {
        Authorization: await getHostAuthToken(),
      },
      body: JSON.stringify({
        guestId: "f08999d3-697c-44a0-b388-a414178d4c5b",
        propertyId: "4392306c-5ca2-439e-83a7-9cf4dd9728c0",
        wishlistName: "My next trip",
      }),
    })
  );
}

post();
