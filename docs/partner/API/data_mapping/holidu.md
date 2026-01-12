# Holidu data mapping 

## Description 
This document outlines the current status of the Holidu data mapping and is intended for future developers who will continue work on maintaining and expanding the Holidu data mapping system.

The goal of this mapping layer is to translate internal Domits property data into a Holidu-compatible format that can be consumed via Holidu’s connectivity platform. The mapping is part of the broader multi-channel distribution strategy and is expected to be reused when integrating future channels (e.g., Airbnb, Booking.com, VRBO).

## Metadata
Lambda Function: partner-listingDetails

Status: **In Development/Active**


# System context 
During the development of the data mapping for Holidu, we need to explain how the process works. 

At the moment, Domits uses the property handler as the core function of its platform. Since the property hanlder does not allow us to take certain information due to security risks, we have decided to make a seperate API for external channels, which allows us to take all the necessary information needed for the holdiu mapping. 

# Security & Authorization
Currently **no authentication** is enforced.

**Implications / Future Requirements:**
Holidu API integration will require secure credentials
 - Expected future changes:
 - OAuth2 / token exchange, or
 - API Key / client-secret model
 - mTLS and/or signed payloads (depending on Holidu requirements)

**Open considerations:**
 - Secrets storage (AWS Parameter Store / Secrets Manager)
 - IAM policies for outbound calls
 - Rate limiting and request throttling
 - Audit logging and traceability