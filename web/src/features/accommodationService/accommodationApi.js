import React, { useState, useEffect } from "react";
import axios from axios;


const API_BASE_URL =
    "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";


const response = await axios.post(API_BASE_URL, formattedData, {
    headers: { "Content-Type": "application/json" },
});