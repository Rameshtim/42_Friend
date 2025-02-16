const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        const host = this.getEmailHost(process.env.EMAIL_USER);
        this.transporter = nodemailer.createTransport({
            service: host,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });
    }

    getEmailHost(email) {
        if (email.includes('@gmail.com')) return 'gmail';
        if (email.includes('@outlook.com') || email.includes('@hotmail.com')) return 'office365';
        if (email.includes('@yahoo.com')) return 'yahoo';
        throw new Error('Unsupported email provider');
    }

    async sendStatusChangeEmail(to, username, status) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject: '42 Campus Status Update',
            text: status.isOnline 
                ? `${username} has arrived on campus! Location: ${status.location}`
                : `${username} has left the campus`,
            html: this.generateEmailHTML(username, status)
        };

        try {
            // console.log("Attempting to send email with these options:", mailOptions);
            const resabout = await this.transporter.sendMail(mailOptions);
            // console.log("Email sent successfully:", resabout);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    async sendStatusChangeEmailAlso(username, to, fromEmail, toName) {
        const slackDMUrl = `https://slack.com/app_redirect?channel=@${fromEmail}`;
    
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject: `📢 ${username} is now on campus at 42 School!`,
            text: `Hey! ${toName}, ${username} just logged in at 42 School and is expecting you. Click here to DM them on Slack: ${slackDMUrl}`,
            html: this.generateSlackDMEmailHTML(username, slackDMUrl, toName)
        };
    
        try {
            const response = await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }    

    generateEmailHTML(username, status) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c3e50;">42 Campus Status Update</h2>
                <div style="background-color: ${status.isOnline ? '#27ae60' : '#c0392b'}; padding: 20px; border-radius: 5px; color: white;">
                    <h3>${status.isOnline ? '✅ Campus Arrival' : '❌ Campus Departure'}</h3>
                    <p><strong>${username}</strong> ${status.isOnline ? 'has arrived on campus!' : 'has left the campus'}</p>
                    ${status.isOnline ? `<p>Location: ${status.location}</p>` : ''}
                </div>
            </div>
        `;
    }

    generateSlackDMEmailHTML(username, slackDMUrl, toName) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                <h2 style="color: #2c3e50; text-align: center;">📢 ${username} is Now on Campus!</h2>
                <p style="font-size: 16px; text-align: center;">Hey ${toName}! 👋</p>
                <p style="font-size: 16px; text-align: center;"><strong>${username}</strong> just logged into 42 School and is expecting you.</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${slackDMUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #4A154B; text-decoration: none; border-radius: 5px;">
                        💬 Message ${username} on Slack
                    </a>
                </div>
                <p style="text-align: center; font-size: 14px; color: #555; margin-top: 20px;">See you soon at 42! 🚀</p>
            </div>
        `;
    }
    
}

module.exports = {
    EmailService,
};