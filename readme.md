# Motivational Quote Notification Service

## Overview

This project is a server application built using Node.js and Express that sends personalized motivational quotes to users via push notifications. The application leverages the OpenAI API to generate motivational quotes tailored to each user's profile, including their name, gender, age, occupation, and preferred language. Notifications are sent using the Expo push notification service.

##Frontend code GitHub repository - https://github.com/eerla/Thrive

## Features

- **User Registration**: Users can register their device tokens and personal information to receive personalized motivational quotes.
- **Personalized Quotes**: Quotes are generated using OpenAI's API, customized based on user details.
- **Push Notifications**: Notifications are sent using Expo's push notification service.
- **Scheduled Notifications**: A cron job is set up to send notifications daily at 11 PM.

## Prerequisites

- Node.js and npm installed on your machine.
- An Expo account and access to Expo's push notification service.
- An OpenAI API key, set in your environment variables as `OPENAI_API_KEY`.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/motivational-quote-service.git
   cd motivational-quote-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables in a `.env` file:
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the server:
   ```bash
   node server.js
   ```

## Endpoints

### 1. Register User

- **URL**: `/register`
- **Method**: `POST`
- **Description**: Registers a user's device token and personal information. Sends an initial motivational quote notification.
- **Request Body**:
  ```json
  {
    "token": "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "name": "John Doe",
    "gender": "male",
    "age": 30,
    "occupation": "engineer",
    "language": "English",
    "frequency": "daily"
  }
  ```
- **Responses**:
  - `200 OK`: User data saved successfully and notification sent.
  - `400 Bad Request`: Invalid Expo push token.

### 2. Send Notification

- **URL**: `/send-notification`
- **Method**: `POST`
- **Description**: Sends motivational quote notifications to all registered users.
- **Responses**:
  - `200 OK`: Notifications sent successfully.
  - `500 Internal Server Error`: Failed to send notifications.

## Scheduled Tasks

- **Daily Notification Job**: A cron job is scheduled to run every day at 11 PM to send notifications to all registered users.

## Technologies Used

- **Node.js**: JavaScript runtime for building the server.
- **Express**: Web framework for Node.js.
- **Expo**: Service for sending push notifications.
- **OpenAI API**: Used to generate motivational quotes.
- **node-cron**: Library for scheduling tasks.
- **axios**: HTTP client for making requests to the OpenAI API.

## Error Handling

- Logs errors to the console for debugging purposes.
- Provides default motivational messages if the OpenAI API fails to return a quote.

## Future Enhancements

- Implement a database to persist user data.
- Add more customization options for quotes.
- Support for multiple languages and styles of quotes.

## License

This project is licensed under the MIT License.

## Contact

For any questions or issues, please contact [gurubrahmam443@gmail.com].
