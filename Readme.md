# Online Friend Notifier for 42 Campus

## 🎯 Overview
42 Friend is a containerized application designed to enhance collaboration among 42 students working on group projects. By tracking campus presence of team members, it helps project teams coordinate their work sessions and maximize in-person collaboration opportunities.

## ✨ Features
### Current Features
- Users greater than level 10 can see and track active Users in Campus
- Real-time tracking of user who are almost at same level presence at 42 campus
- Recent Users (Who has logged in past seven days) around same level
- Email notification or Normal Notification when tracked users log in or log out
- Monitor and Get Notified for more than 1 Friend
- User lookup by intra username
- User profile or Slack Profile with one click
- Integration with 42 API for accurate status checks

### Maybe
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
- Email setup (Optional)


## 🚀 Getting Started

1. ### Clone the repository
```bash
git clone https://github.com/Rameshtim/42_Friend
cd 42_Friend
make build # If .env file is not present will get created
# Then after updating .env file run
make build #again
```

2. ### Configure environment variables
    - #### First Update .env file
```
Edit `.env` file with your API Credentials:
```
```
FT_CLIENT_ID="u-s4t2ud..."      uid(as shown in intra)
FT_CLIENT_SECRET="s-s4t2ud..."  secret(as shown in intra)
```

- #### Optional to send Email (Only Gmail tested)


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