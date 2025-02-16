# Online Friend Notifier for 42 Campus

## 🎯 Overview
42 Friend is a containerized application designed to enhance collaboration among 42 students working on group projects. By tracking campus presence of team members, it helps project teams coordinate their work sessions and maximize in-person collaboration opportunities.

## ✨ Features
### Current Features
- Real-time tracking of user presence at 42 campus
- Email notification when tracked users log in or log out
- Get Notified for more than 1 Friend
- User lookup by intra username
- Integration with 42 API for accurate status checks

### Coming Soon
- Slack DM notifications when tracked users log in or log out

## 🛠️ Technologies
- Docker
- Node.js
- 42 API
- JavaScript
- OAuth 2.0 for authentication

## 📋 Prerequisites
- Docker (Available in 42 Clusters)
- 42 API (Simple Setup in intra, [42 API Documentation](https://api.intra.42.fr/apidoc) or [click here](images/setup.md) for detailed Instructions)


## 🚀 Getting Started

1. ### Clone the repository
```bash
git clone https://github.com/Rameshtim/42_Friend
cd 42_Friend
```

2. ### Configure environment variables
    - #### First Update .env file
```
Edit `.env` file with your API Credentials:
```
```
FT_CLIENT_ID=uid(as shown in intra)
FT_CLIENT_SECRET=secret(as shown in intra)
```

    - #### For Future to send Email


```
EMAIL_USER=your-gmail
EMAIL_PASS=your-gmail-App Passwords
```
#### Since Gmail will not allow you to log in with Username and Password you have to have App passwords
#### 2FA Must be enabled to get App passwords
- Go to your Google Account settings: https://myaccount.google.com/
- Navigate to "Security."
- Look for "App passwords" (you might need to search for it)

3. ### Start/Stop the application using Docker
```Docker
docker compose up --build
```
```
docker compose down
```
4. ### Start/Stop using make
```
make build
make down
make clean
```

## 🔒 Authentication
The application uses OAuth 2.0 to authenticate with the 42 API. 



## 🙏 Acknowledgments
- 42 School for providing the API

## 📞 Contact

Connect on [LinkedIn](https://www.linkedin.com/in/ramesh-timsina)


Github - [@rtimsina](https://github.com/Rameshtim)

Project Link: [https://github.com/Rameshtim/42_Friend](https://github.com/Rameshtim/42_Friend)