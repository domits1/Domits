import { Controller } from "./controller/controller.js";
import Database from "database";

let controller = null;
let pool = null;

export const handler = async (event) => {
  try {
    if (!controller) {
      controller = new Controller();
    }
    if (!pool) {
      pool = await Database.getInstance();
    }

    const { httpMethod, path } = event;

    if (httpMethod === "POST" && path.endsWith("/invoices")) {
      return await controller.createInvoice(event);
    }
    if (httpMethod === "GET" && path.endsWith("/invoices")) {
      return await controller.getInvoices(event);
    }
    if (httpMethod === "GET" && path.match(/\/invoices\/[^/]+$/)) {
      return await controller.getInvoiceById(event);
    }

    return { statusCode: 404, body: JSON.stringify({ message: "Route not found." }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: "Something went wrong, please contact support." }) };
  }
};
