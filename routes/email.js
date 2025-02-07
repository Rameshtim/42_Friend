const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const { email, sendEmail, username } = req.body;

  if (!sendEmail) {
    return res.redirect("/profile");
  }


  const userStatus = req.body.is_in_campus ? "on campus ✅" : "not on campus ❌";

   console.log("this is req.body", req.body); 
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "42 School Campus Status",
    text: `Hello, the user ${username} is currently ${userStatus}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send("Email sent successfully!");
  } catch (error) {
    console.error("Email sending failed:", error);
    res.send("Failed to send email.");
  }
});

module.exports = router;
