import { handler } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/index.js";

async function get() {
  console.log(
    await handler({
      httpMethod: "GET",
    })
  );
}

get();
