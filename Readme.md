# Online Friend Notifier for 42 Campus

## 🎯 Overview
42 Friend is a containerized application designed to enhance collaboration among 42 students working on group projects. By tracking campus presence of team members, it helps project teams coordinate their work sessions and maximize in-person collaboration opportunities.

## ✨ Features
### Current Features
- Real-time tracking of user presence at 42 campus
- User lookup by intra username
- Integration with 42 API for accurate status checks

### Coming Soon
- Get Notified for more than 1 Friend
- Slack DM notifications when tracked users log in or log out
- Email notification when tracked users log in or log out

## 🛠️ Technologies
- Docker
- Node.js
- 42 API
- JavaScript
- OAuth 2.0 for authentication

## 📋 Prerequisites
- Docker (Available in 42 Clusters)
- 42 API (Simple Setup in intra, click [here to see](images/setup.md) detailed Instructions)


## 🚀 Getting Started

1. ### Clone the repository
```bash
git clone https://github.com/Rameshtim/42_Friend
cd 42_Friend
```

2. ### Configure environment variables
```bash
touch .env
```
Edit `.env` file with your Email(Future Work):
```
FT_CLIENT_ID=uid(as shown in intra)
FT_CLIENT_SECRET=secret(as shown in intra)
EMAIL_USER=your-gmail
EMAIL_PASS=your-gmail-password
```

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
Ramesh - [@rtimsina](https://github.com/Rameshtim)

Project Link: [https://github.com/Rameshtim/42_Friend](https://github.com/Rameshtim/42_Friend)