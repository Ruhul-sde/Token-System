
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmailNotification = async (to, token) => {
  try {
    if (!process.env.SMTP_USER) {
      console.log('Email notification skipped - SMTP not configured');
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: `New Token Created: ${token.title}`,
      html: `
        <h2>New Token Alert</h2>
        <p><strong>Title:</strong> ${token.title}</p>
        <p><strong>Description:</strong> ${token.description}</p>
        <p><strong>Priority:</strong> ${token.priority}</p>
        <p><strong>Created At:</strong> ${token.createdAt}</p>
      `
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};
