const EventEmitter = require('events');
const fetch = require('node-fetch');
const TokenManager = require('./tokenManager');
console.log("TokenManager:", TokenManager); // Crucial debugging step!

class StatusMonitor extends EventEmitter {
    constructor() {
        super();
        this.activeMonitors = new Map();
        this.tokenManager = new TokenManager();
    }

    async checkUserStatus(username, accessToken) {
        try {
            const response = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            // console.log('This is acces token: ', accessToken);
            // console.log('This is response: ', response);

            if (response.status === 401) {
                // Token expired, try to refresh
                const newToken = await this.tokenManager.refreshToken(username);
                if (newToken) {
                    return this.checkUserStatus(username, newToken);
                }
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const userData = await response.json();
            return {
                username,
                location: userData.location,
                displayname: userData.displayname,
                image: userData.image,
                isOnline: typeof userData.location === 'string'
            };
        } catch (error) {
            console.error(`Error checking status for ${username}:`, error);
            throw error;
        }
    }

    async startMonitoring(username, accessToken, email, duration) {
        console.log('monitoring started in startMonitoring function for ', username);
        if (this.activeMonitors.has(username)) {
            return false;
        }
        console.log('continue monitoring in startMonitoring function for ', username);

        const monitor = {
            email,
            accessToken,
            lastStatus: null,
            startTime: Date.now(),
            // duration: 5 * 1000, // Convert minutes to milliseconds
            duration: duration * 60 * 1000, // Convert minutes to milliseconds
            intervalId: null
        };

        monitor.intervalId = setInterval(async () => {
            try {
                // Check if monitoring duration has expired
                if (Date.now() - monitor.startTime >= monitor.duration) {
                    this.stopMonitoring(username);
                    this.emit('monitoringExpired', { username, email });
                    console.log('monitoring expired');
                    return;
                }

                const status = await this.checkUserStatus(username, monitor.accessToken);
                console.log("monitoring started for given time.");
                // Only emit if status changed
                if (!monitor.lastStatus || monitor.lastStatus.isOnline !== status.isOnline) {
                    this.emit('statusChange', {
                        ...status,
                        email: monitor.email
                    });
                }
                
                monitor.lastStatus = status;

            } catch (error) {
                this.emit('error', { username, error });
            }
        }, 5000); // Check every minute

        this.activeMonitors.set(username, monitor);
        return true;
    }

    stopMonitoring(username) {
        const monitor = this.activeMonitors.get(username);
        if (monitor) {
            clearInterval(monitor.intervalId);
            this.activeMonitors.delete(username);
            return true;
        }
        return false;
    }

    stopAll() {
        for (const [username, monitor] of this.activeMonitors) {
            clearInterval(monitor.intervalId);
        }
        this.activeMonitors.clear();
    }
}


module.exports = {
    StatusMonitor,
};