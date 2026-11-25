# Food-Donation-Inventory-Tracker
# Food Donation & Inventory Tracker (Smart Shelf-Life Monitoring & Surplus Food Redistribution Engine)

A full-stack web application designed for community kitchens and NGOs to track food donations, monitor item shelf-life in real time, and coordinate surplus food redistribution before spoilage occurs.

## Project Overview

Food waste and hunger often exist side-by-side due to poor inventory visibility and delayed distribution. This platform enables community kitchens and partner NGOs (such as **Samaveshi Vikas Foundation**) to log incoming food donations, track expiration timelines, and prioritize urgent distributions.

## Features

- **Donation Logging & Inventory Management:** Add, view, update, and manage donated food batches with quantity, category, and storage details.
- **Shelf-Life & Expiry Monitoring:** Track expiration dates to prioritize near-expiry items for immediate redistribution.
- **RESTful API Architecture:** Clean Express.js backend connected to MongoDB Atlas for persistent cloud storage.
- **Responsive Dashboard UI:** Simple, intuitive frontend built with HTML5, CSS3, and vanilla JavaScript.

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (`public/index.html`, `public/style.css`, `public/app.js`)
- **Backend:** Node.js, Express.js (`server.js`)
- **Database:** MongoDB Atlas with Mongoose ODM (`models/donations.js`)
- **Environment & Middleware:** `dotenv`, `cors`

## Project Structure

```text
Food Redistribution Engine/
├── models/
│   └── donations.js       # Mongoose schema and model for food donations
├── public/
│   ├── index.html         # Main dashboard interface
│   ├── style.css          # Application styling
│   └── app.js             # Frontend logic and API integration
├── .env                   # Environment variables (ignored in Git)
├── .gitignore             # Ignored files and folders
├── package.json           # Project metadata and dependencies
└── server.js              # Express server and database connection
