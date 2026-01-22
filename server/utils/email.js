import nodemailer from 'nodemailer';
import AdminProfile from '../models/AdminProfile.js';

/* ======================= ENV DEBUG ======================= */
console.log('📧 EMAIL ENV CHECK:', {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS_EXISTS: !!process.env.SMTP_PASS
});

/* ======================= TRANSPORTER ======================= */
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/* ======================= VERIFY SMTP ======================= */
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP VERIFY FAILED:', err.message);
  } else {
    console.log('✅ SMTP CONNECTED (Office365)');
  }
});

/* ======================= EMAIL WRAPPER ======================= */
const emailWrapper = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f4f6f8;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: #ffffff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .header {
      background: #0b5ed7;
      color: #ffffff;
      padding: 15px 20px;
      font-size: 18px;
      font-weight: bold;
    }
    .content {
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 6px 10px;
      background: #e9f2ff;
      color: #0b5ed7;
      border-radius: 4px;
      font-weight: bold;
      margin: 10px 0;
    }
    .footer {
      font-size: 12px;
      color: #777;
      text-align: center;
      padding: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${title}</div>
    <div class="content">${body}</div>
    <div class="footer">
      © ${new Date().getFullYear()} ASTL Ticket System<br/>
      This is an automated email. Please do not reply.
    </div>
  </div>
</body>
</html>
`;

/* ======================= USER: TICKET CREATED ======================= */
export const sendTicketCreatedEmail = async (to, ticket) => {
  try {
    if (!to) return;

    const html = emailWrapper(
      '🎫 Ticket Created Successfully',
      `
      <p>Hello <strong>${ticket.createdBy?.name || 'User'}</strong>,</p>

      <p>Your support ticket has been created successfully.</p>

      <div class="badge">Ticket No: ${ticket.ticketNumber}</div>

      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
      <p><strong>Status:</strong> Pending</p>

      <p>Our support team will contact you shortly.</p>

      <p>Regards,<br/><strong>ASTL Support Team</strong></p>
      `
    );

    await transporter.sendMail({
      from: `"ASTL Ticket System" <${process.env.SMTP_USER}>`,
      to,
      subject: `Ticket Created | ${ticket.ticketNumber}`,
      html
    });

    console.log('✅ USER TICKET CREATED EMAIL SENT');

  } catch (error) {
    console.error('❌ USER EMAIL FAILED:', error);
  }
};

/* ======================= ADMIN: DEPARTMENT ALERT ======================= */
export const sendAdminTicketAlertEmail = async (ticket) => {
  try {
    if (!ticket?.department) {
      console.warn('⚠️ Ticket has no department. Admin mail skipped.');
      return;
    }

    // 🔍 Find admins for this department
    const adminProfiles = await AdminProfile.find({
      department: ticket.department._id || ticket.department
    }).populate('user', 'name email role');

    if (!adminProfiles.length) {
      console.warn('⚠️ No admins found for department');
      return;
    }

    const adminEmails = adminProfiles
      .map(p => p.user?.email)
      .filter(Boolean);

    if (!adminEmails.length) {
      console.warn('⚠️ Admins found but no valid emails');
      return;
    }

    const html = emailWrapper(
      '🚨 New Ticket Alert',
      `
      <p>Hello Admin,</p>

      <p><strong>A new support ticket has been created.</strong></p>

      <div class="badge">Ticket No: ${ticket.ticketNumber}</div>

      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
      <p><strong>Department:</strong> ${ticket.department?.name || 'N/A'}</p>

      <p style="color:#c0392b;font-weight:bold;">
        Please review and resolve this ticket as soon as possible.
      </p>

      <p>Regards,<br/><strong>ASTL Ticket System</strong></p>
      `
    );

    const info = await transporter.sendMail({
      from: `"ASTL Ticket System" <${process.env.SMTP_USER}>`,
      to: adminEmails,
      subject: `🚨 New Ticket Created | ${ticket.ticketNumber}`,
      html
    });

    console.log('✅ ADMIN ALERT SENT:', adminEmails, info.messageId);

  } catch (error) {
    console.error('❌ ADMIN EMAIL FAILED:', error);
  }
};

/* ======================= USER: TICKET RESOLVED ======================= */
export const sendTicketResolvedEmail = async (to, ticket) => {
  try {
    if (!to) return;

    const html = emailWrapper(
      '✅ Ticket Resolved',
      `
      <p>Hello <strong>${ticket.createdBy?.name || 'User'}</strong>,</p>

      <p>Your ticket has been resolved successfully.</p>

      <div class="badge">Ticket No: ${ticket.ticketNumber}</div>

      <p>Please login to your dashboard for details.</p>

      <p>Regards,<br/><strong>ASTL Support Team</strong></p>
      `
    );

    await transporter.sendMail({
      from: `"ASTL Ticket System" <${process.env.SMTP_USER}>`,
      to,
      subject: `Ticket Resolved | ${ticket.ticketNumber}`,
      html
    });

    console.log('✅ TICKET RESOLVED EMAIL SENT');

  } catch (error) {
    console.error('❌ RESOLVED EMAIL FAILED:', error);
  }
};

/* ======================= USER: TOKEN COMPLETED ======================= */
export const sendTokenCompletedEmail = async (to, token) => {
  try {
    if (!to) return;

    const html = emailWrapper(
      '🎯 Token Completed',
      `
      <p>Hello <strong>${token.createdBy?.name || 'User'}</strong>,</p>

      <p>Your token has been completed successfully.</p>

      <div class="badge">Token No: ${token.ticketNumber}</div>

      <p>Regards,<br/><strong>ASTL Support Team</strong></p>
      `
    );

    await transporter.sendMail({
      from: `"ASTL Ticket System" <${process.env.SMTP_USER}>`,
      to,
      subject: `Token Completed | ${token.ticketNumber}`,
      html
    });

    console.log('✅ TOKEN COMPLETED EMAIL SENT');

  } catch (error) {
    console.error('❌ TOKEN EMAIL FAILED:', error);
  }
};
