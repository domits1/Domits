### Web and App Messaging Experience

This document captures the Host and Guest Messaging experiences across Web and App, aligned with the product wiki reference: [Web chat](https://github.com/domits1/Domits/wiki/Web-chat).

## Scope

- **Web: Host Messaging Experience**
- **Web: Guest Messaging Experience**
- **App: Host Messaging Experience**
- **App: Guest Messaging Experience**

### Three Components of Host Messaging Experience

- **Web Host Messaging: Unified Inbox for Guest Communication (Email, Text, Whatsapp) #767**
- **Web/App Host Messaging: AI Agent for Property Managers #493**
- **Web Host/Guest Messaging: Notifications/Automated Reservation Messages (AWS SNS) #1086**

## User Story

As a host,
I want a streamlined messaging system to communicate with guests,
so that I can address inquiries, share important information, and provide excellent customer service.

## Acceptance Criteria

- **User-Friendly Messaging Interface**
  - Hosts have access to a dedicated messaging section within their dashboard that displays all conversations with guests in a clear and organized format.
  - Each conversation thread shows the guest’s name, booking details, and timestamps for messages.

- **Real-Time Notifications**
  - Hosts receive real-time notifications for new messages, including push notifications on mobile devices and alerts on the dashboard.
  - Notifications include a brief preview of the message content to allow quick assessment.

- **Message Composition and Formatting**
  - Hosts can compose messages using a rich text editor that allows for basic formatting (bold, italics, bullet points) to enhance clarity.
  - The system includes predefined templates for common messages (e.g., check-in instructions, house rules) that hosts can customize and send quickly.

- **Search and Filter Functionality**
  - A search bar allows hosts to quickly find specific conversations or messages using keywords, guest names, or booking dates.
  - Filters can be applied to view messages from specific guests or for particular properties.

- **Attachments and Media Sharing**
  - Hosts can attach files or images (e.g., check-in instructions, property guidelines) to messages for enhanced communication.
  - Image previews are displayed in the message thread.

- **Response Time Tracking**
  - The system tracks and displays the average response time for each host, encouraging timely communication with guests.
  - Hosts can see reminders for unanswered messages after a set period (e.g., 24 hours).

- **Guest Messaging Options**
  - Guests can message hosts directly through the platform, with the messaging system designed to keep communication organized and secure.
  - A "Reply" button allows guests to respond easily to messages, maintaining the conversation thread.

- **Privacy and Security**
  - All messages are securely stored and encrypted to protect the privacy of both hosts and guests.
  - Personal contact information (e.g., phone numbers, email addresses) is not visible to guests unless shared by the host.

- **Integration with Booking Details**
  - The messaging interface automatically pulls in relevant booking information (e.g., check-in/check-out dates, number of guests) to provide context for conversations.

## What-If Scenarios

- **What if a host misses a message from a guest?**
  - Implement automated reminders that alert hosts about unread messages after a specified time frame (e.g., 12 hours), encouraging timely responses.

- **What if a guest sends a question that requires detailed information?**
  - Provide hosts with the ability to send lengthy responses or attach detailed documents without restrictions, ensuring they can provide comprehensive answers.

- **What if a host wants to refer back to a previous conversation?**
  - The search functionality allows hosts to look up past messages using keywords, ensuring they can quickly find relevant conversations without scrolling.

- **What if a host needs to communicate with multiple guests at once?**
  - Consider implementing a group messaging feature that allows hosts to send a single message to multiple guests if relevant (e.g., a notice about property maintenance).

- **What if a guest is unresponsive to messages?**
  - The system could flag conversations where the host has not received a reply after a specific time, prompting the host to follow up with the guest.

- **What if a host wants to send a message outside of business hours?**
  - Allow hosts to schedule messages to be sent at a later time, giving them the flexibility to manage communication effectively without feeling pressured.

- **What if a host wants to maintain professionalism in their messages?**
  - Provide tips or examples of professional communication styles within the messaging interface to guide hosts in crafting their responses.

- **What if there are technical issues with the messaging system?**
  - Include a help or support feature within the messaging interface that directs hosts to troubleshooting guides or customer support for immediate assistance.

- **What if a host needs to communicate a last-minute change to a guest?**
  - Ensure the messaging system allows for immediate notifications to the guest, with prompts reminding the host of the importance of timely communication for urgent matters.

- **What if the platform experiences downtime affecting the messaging feature?**
  - Implement a backup notification system (e.g., email alerts) to inform hosts and guests of important messages during downtime, ensuring they stay informed.

## Customer Journey for Host Messaging

- **Pre-Arrival**: Live chat, AI-powered chatbot, upsells with automated messages, digital registration
- **In-Stay**: Unified inbox, multi-channel, organize tickets/tasks/inspections/workflows, surveys
- **Post-Stay**: Receive feedback, boost review scores, guest sentiment


