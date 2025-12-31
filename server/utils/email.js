import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

export const sendEmailNotification = async (to, token, customOptions = {}) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email notification skipped - SMTP credentials not configured');
      console.warn('   Please set SMTP_USER and SMTP_PASS in your .env file');
      return { success: false, message: 'SMTP not configured' };
    }

    if (!to) {
      console.error('❌ Email notification failed - recipient email is missing');
      return { success: false, message: 'Recipient email required' };
    }

    const mailOptions = {
      from: `"Support System" <${process.env.SMTP_USER}>`,
      to,
      ...customOptions
    };

    // Default email for admin notification if no custom options provided
    if (!customOptions.subject && token) {
      mailOptions.subject = `New Token Created: ${token.title}`;
      mailOptions.html = `
        <h2>New Token Alert</h2>
        <p><strong>Title:</strong> ${token.title}</p>
        <p><strong>Description:</strong> ${token.description}</p>
        <p><strong>Priority:</strong> ${token.priority}</p>
        <p><strong>Created At:</strong> ${token.createdAt}</p>
      `;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Please check your SMTP credentials.');
    } else if (error.code === 'ESOCKET') {
      console.error('   Connection failed. Please check your SMTP host and port.');
    }
    return { success: false, error: error.message };
  }
};

export const sendTokenCreatedEmail = async (userEmail, token) => {
  const subject = `Token Created: ${token.tokenNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ED1B2F;">Token Created Successfully</h2>
      <p>Dear User,</p>
      <p>Your support token has been created successfully. Here are the details:</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Token Number:</strong> ${token.tokenNumber}</p>
        <p><strong>Title:</strong> ${token.title}</p>
        <p><strong>Description:</strong> ${token.description}</p>
        <p><strong>Priority:</strong> <span style="text-transform: uppercase; color: ${
          token.priority === 'high' ? '#ED1B2F' : token.priority === 'medium' ? '#FFA500' : '#4CAF50'
        };">${token.priority}</span></p>
        <p><strong>Status:</strong> ${token.status}</p>
        <p><strong>Created At:</strong> ${new Date(token.createdAt).toLocaleString()}</p>
        ${token.department ? `<p><strong>Department:</strong> ${token.department.name || 'Unassigned'}</p>` : ''}
      </div>

      <p>Our team will review your token and get back to you as soon as possible.</p>
      <p>You can track the progress of your token in your dashboard.</p>

      <p>Best regards,<br>Support Team</p>
    </div>
  `;

  await sendEmailNotification(userEmail, null, { subject, html });
};

export const sendTokenCompletedEmail = async (userEmail, token) => {
  const subject = `Token Resolved: ${token.tokenNumber} - Please Review`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Your Token Has Been Resolved!</h2>
      <p>Dear User,</p>
      <p>Great news! Your support token has been resolved by our team.</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Token Number:</strong> ${token.tokenNumber}</p>
        <p><strong>Title:</strong> ${token.title}</p>
        <p><strong>Resolved By:</strong> ${token.solvedBy?.name || 'Admin'}</p>
        <p><strong>Resolved At:</strong> ${new Date(token.solvedAt).toLocaleString()}</p>
        ${token.solution ? `
          <div style="margin-top: 15px;">
            <p><strong>Solution:</strong></p>
            <p style="background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin-top: 5px;">
              ${token.solution}
            </p>
          </div>
        ` : ''}
      </div>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #FFA500; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">We Value Your Feedback!</h3>
        <p>Please take a moment to review the resolution and rate your experience.</p>
        <p>Your feedback helps us improve our service quality.</p>
        <p style="margin-top: 15px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" 
             style="display: inline-block; background-color: #ED1B2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Leave Feedback
          </a>
        </p>
      </div>

      <p>If you have any questions or concerns about the resolution, please don't hesitate to contact us.</p>

      <p>Best regards,<br>Support Team</p>
    </div>
  `;

  await sendEmailNotification(userEmail, null, { subject, html });
};

export async function sendTicketCreatedEmail(email, ticket) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email skipped - SMTP credentials not configured');
      return null;
    }

    const mailOptions = {
      from: `"Support System" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@ticketsystem.com'}>`,
      to: email,
      subject: `Ticket Created: ${ticket.ticketNumber || ticket.tokenNumber}`,
      html: `
        <h2>Your Support Ticket Has Been Created</h2>
        <p>Ticket Number: <strong>${ticket.ticketNumber || ticket.tokenNumber}</strong></p>
        <p>Title: ${ticket.title}</p>
        <p>Status: ${ticket.status}</p>
        <p>Priority: ${ticket.priority}</p>
        <p>We'll get back to you soon!</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    return null;
  }
}

export async function sendTicketResolvedEmail(email, ticket) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email skipped - SMTP credentials not configured');
      return null;
    }

    const mailOptions = {
      from: `"Support System" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@ticketsystem.com'}>`,
      to: email,
      subject: `Ticket Resolved: ${ticket.ticketNumber || ticket.tokenNumber}`,
      html: `
        <h2>Your Support Ticket Has Been Resolved</h2>
        <p>Ticket Number: <strong>${ticket.ticketNumber || ticket.tokenNumber}</strong></p>
        <p>Title: ${ticket.title}</p>
        <p>Solution: ${ticket.solution || 'See ticket for details'}</p>
        <p>Resolved by: ${ticket.solvedBy?.name || 'Support Team'}</p>
        <p>Please provide feedback on your experience!</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    return null;
  }
}