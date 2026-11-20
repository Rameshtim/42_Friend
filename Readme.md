# Online Friend Notifier for 42 Campus

## Overview
42 Friend is a containerized Node.js/Express web app for 42 campus students. It authenticates via the 42 (Intra) API (OAuth 2.0) and lets students find peers on campus, check projects, levels, and recent activity. Monitoring, email notifications, and bookmarks have been removed; the app now focuses on peer discovery and campus presence.

## Features
- Login with 42 account
- Find online peers around your level
- Advanced campus search by campus and level range
- View user profiles, projects, and last seen
- Slack DM links for peers
- Campus presence overview

## Technologies
- Node.js / Express
- EJS views
- Redis (sessions)
- Docker
- 42 API (OAuth 2.0)

## Running Locally
Follow this [guide](images/locally.md). Or use Docker: `make build`.

## Authentication
OAuth 2.0 with the 42 API.

## Contact
Connect on [LinkedIn](https://www.linkedin.com/in/ramesh-timsina)
Github - [@rtimsina](https://github.com/Rameshtim)
Project Link: [https://github.com/Rameshtim/42_Friend](https://github.com/Rameshtim/42_Friend)