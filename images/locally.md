
## 📋 Prerequisites
- Docker (Available in 42 Clusters)
- 42 API (Simple Setup in intra, [42 API Documentation](https://api.intra.42.fr/apidoc) or [click here](setup.md) for detailed Instructions)
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
