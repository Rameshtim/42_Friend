const { WebClient } = require('@slack/web-api');

class SlackService {
    constructor() {
        this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    }

    async sendStatusChangeMessage(slackUserId, username, status) {
        const message = status.isOnline 
            ? `🚀 *${username}* has just arrived at *42 Campus*! 📍 Location: ${status.location}`
            : `👋 *${username}* has left the campus.`;

        try {
            await this.client.chat.postMessage({
                channel: slackUserId,
                text: message,
                blocks: this.generateSlackStatusBlocks(username, status)
            });
            return true;
        } catch (error) {
            console.error('Error sending Slack message:', error);
            return false;
        }
    }

    async sendStatusChangeMessageAlso(senderSlackId, recipientSlackId, senderUsername) {
        const message = `📢 *${senderUsername}* is expecting you at *42 Campus*! Let them know when you'll arrive.`;

        try {
            await this.client.chat.postMessage({
                channel: recipientSlackId,
                text: message,
                blocks: this.generateSlackExpectingBlocks(senderUsername, senderSlackId)
            });
            return true;
        } catch (error) {
            console.error('Error sending Slack DM:', error);
            return false;
        }
    }

    generateSlackStatusBlocks(username, status) {
        return [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: status.isOnline 
                        ? `🚀 *${username}* has just arrived at *42 Campus*! 📍 *Location*: ${status.location}`
                        : `👋 *${username}* has left the campus.`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "_This is an automated campus status update._"
                    }
                ]
            }
        ];
    }

    generateSlackExpectingBlocks(senderUsername, senderSlackId) {
        return [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `📢 *${senderUsername}* is expecting you at *42 Campus*! Let them know when you'll arrive.`
                }
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "💬 Message on Slack"
                        },
                        url: `https://slack.com/app_redirect?channel=@${senderSlackId}`,
                        style: "primary"
                    }
                ]
            }
        ];
    }
}

module.exports = {
    SlackService,
};
