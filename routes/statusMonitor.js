const EventEmitter = require('events');
const fetch = require('node-fetch');
const TokenManager = require('./tokenManager');
const { stat } = require('fs');

class StatusMonitor extends EventEmitter {
    constructor() {
        super();
        this.activeMonitors = new Map();
        this.tokenManager = new TokenManager();
        this.notifications = {};
    }

    async checkUserStatus(username, accessToken) {
        try {
            const response = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

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
            console.log('this is from userData location', userData.location);
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

    async startMonitoring(username, accessToken, email, duration, intervall) {
        console.log('monitoring started in startMonitoring function for ', username);
        if (this.activeMonitors.has(username)) {
            return false;
        }
        console.log('continue monitoring in startMonitoring function for ', username);

        const monitor = {
            email,
            accessToken,
            lastStatus: { isOnline: null },
            // lastStatus: null,
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
                console.log("monitoring started for given time for ", username);
                console.log("is available at ", status.location);
                // console.log("this will be checked --", monitor.lastStatus);
                console.log("this will be checked status --", status.isOnline);
                // Only emit if status changed
                // if (!monitor.lastStatus || monitor.lastStatus.isOnline !== status.isOnline) {
                if (monitor.lastStatus.isOnline !== null && monitor.lastStatus.isOnline !== status.isOnline) {
                    console.log('status has changed for email', status.isOnline);
                    if (monitor.email) {
                        this.emit('statusChange', {
                            ...status,
                            email: monitor.email
                        });
                    }
                    const timestamp = new Date().toLocaleString();

                    if (!this.notifications[username]) {
                        this.notifications[username] = [];
                    }

                    this.notifications[username].push({
                        message: `${username} is online`,
                        timestamp
                    });

                    console.log(`Notification: ${username} came online at ${timestamp}`);
                }
                
                monitor.lastStatus = status;
                console.log("laststatus this will be checked --", monitor.lastStatus.isOnline);

            } catch (error) {
                this.emit('error', { username, error });
            }
        }, intervall * 1000); // Check every minute

        this.activeMonitors.set(username, monitor);
        return true;
    }

    stopMonitoring(username) {
        const monitor = this.activeMonitors.get(username);
        if (monitor) {
            console.log('monitoring stopped for ', username);
            clearInterval(monitor.intervalId);
            this.activeMonitors.delete(username);
            return true;
        }
        console.log('monitoring not found for ', username);
        return false;
    }

    stopAll() {
        for (const [username, monitor] of this.activeMonitors) {
            clearInterval(monitor.intervalId);
        }
        this.activeMonitors.clear();
        // console.log("stopping all active monitors")
    }
    getNotifications(username) {
        return this.notifications[username] || [];
    }
}


module.exports = {
    StatusMonitor,
};