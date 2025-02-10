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
}

module.exports = {
    EmailService,
};