class TokenManager {
    constructor() {
        this.clientId = process.env.FT_CLIENT_ID;
        this.clientSecret = process.env.FT_CLIENT_SECRET;
    }

    async refreshToken(refreshToken) {
        try {
            const response = await fetch('https://api.intra.42.fr/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    refresh_token: refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            return data.access_token;
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }
}

// export { TokenManager };
module.exports = TokenManager; // Make absolutely sure this line is present and correct!