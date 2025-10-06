import "dotenv/config"; // process.env
// utils/email.js
import nodemailer from "nodemailer";
import QRCode from "qrcode";
// const text = 'reyad is here'
// await QRCode.toFile('qr.png', text);
// console.log(' qr.png created');
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // مثال: smtp.gmail.com أو smtp.sendgrid.net
  port: Number(process.env.SMTP_PORT || 465), // 465 للـ SSL أو 587 للـ TLS
  secure: process.env.SMTP_SECURE !== "false", // true للـ 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,
});

// قالب التذكرة (HTML)
// export function bookingEmailHtml(booking, trip) {
//   const {
//     _id,
//     adult,
//     child,
//     totalPrice: { egp, euro },
//     transportation,
//     user: { firstName, lastName, email, phone, message },
//     bookingDate,
//   } = booking;

//   const ref = _id.toString().slice(-8).toUpperCase();

//   return `
//   <div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;background:#f7f7f7;padding:30px">
//     <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.1)">

//       <div style="background:#1E90FF;color:#fff;padding:20px 30px;border-top-left-radius:8px;border-top-right-radius:8px">
//         <h2 style="margin:0;font-size:22px;font-weight:600">🎟️ Booking Confirmation</h2>
//         <p style="margin:0;font-size:16px">Ticket Reference: <b style="color:#FFD700">${ref}</b></p>
//       </div>

//       <div style="padding:30px;color:#333;line-height:1.8">
//         <p>Hello <b>${firstName} ${lastName}</b>, your booking has been successfully received! ✅</p>

//         <p style="font-size:16px;color:#555;">Get ready for an unforgettable day at the beach! Your booking to <b>Abu Dabbab Beach</b> is confirmed. 📍</p>
//         <p style="font-size:16px;color:#555;">Please present your ticket QR code at the gate for entry.</p>

//         <h3 style="color:#1E90FF;margin-top:25px;font-size:18px;">Booking Details</h3>
//         <table style="border-collapse:collapse;width:100%;margin-top:20px;background:#f9f9f9;border-radius:8px;">
//           <tr style="background:#e1f5fe;"><td style="border:1px solid #ddd;padding:12px;font-weight:600">Trip Name</td><td style="border:1px solid #ddd;padding:12px">${trip?.name ?? "Adventure Day"}</td></tr>
//           <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff">Booking Date</td><td style="border:1px solid #ddd;padding:12px">${new Date(bookingDate).toLocaleString("en-US")}</td></tr>
//           <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px">Adults</td><td style="border:1px solid #ddd;padding:12px">${adult}</td></tr>
//           <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff">Children</td><td style="border:1px solid #ddd;padding:12px">${child}</td></tr>
//           <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px">Transportation</td><td style="border:1px solid #ddd;padding:12px">${transportation ? "Yes" : "No"}</td></tr>
//           <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff;color:#e60000">Total (EGP)</td><td style="border:1px solid #ddd;padding:12px"><b style="color:#e60000">${Number(egp).toFixed(2)}</b></td></tr>
//           <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px;color:#e60000">Total (EUR)</td><td style="border:1px solid #ddd;padding:12px"><b style="color:#e60000">${Number(euro).toFixed(2)}</b></td></tr>
//         </table>

//         <h3 style="color:#1E90FF;margin-top:25px;font-size:18px;">Client Information</h3>
//         <p>
//           📧 Email: <a href="mailto:${email}" style="color:#1E90FF">${email}</a><br/>
//           📞 Mobile: <span style="color:#333">${phone}</span><br/>
//           ${message ? `<span style="color:#555">📝 Message: ${message}</span>` : ""}
//         </p>

//         <p style="margin-top:25px;font-size:16px;color:#555;">If you have any questions, simply reply to this email. ✉️</p>
//       </div>

//       <div style="background:#f1f1f1;padding:15px 30px;font-size:12px;color:#666;text-align:center;border-bottom-left-radius:8px;border-bottom-right-radius:8px">
//         Ticket Reference: <b>${ref}</b>
//       </div>
//     </div>
//   </div>
// `;

// }
// utils/email.js
export function bookingEmailHtml(booking, trip, { qrCid } = {}) {
  const {
    _id,
    adult,
    child,
    totalPrice: { egp, euro },
    transportation,
    user: { firstName, lastName, email, phone, message },
    bookingDate,
  } = booking;

  const ref = _id.toString().slice(-8).toUpperCase();

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;background:#f7f7f7;padding:30px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.1)">

      <div style="background:#1E90FF;color:#fff;padding:20px 30px;border-top-left-radius:8px;border-top-right-radius:8px">
        <h2 style="margin:0;font-size:22px;font-weight:600">🎟️ Booking Confirmation</h2>
        <p style="margin:0;font-size:16px">Ticket Reference: <b style="color:#FFD700">${ref}</b></p>
      </div>

      <div style="padding:30px;color:#333;line-height:1.8">
        <p>Hello <b>${firstName} ${lastName}</b>, your booking has been successfully received! ✅</p>

        <p style="font-size:16px;color:#555;">Get ready for an unforgettable day at the beach! Your booking to <b>Abu Dabbab Beach</b> is confirmed. 📍</p>
        <p style="font-size:16px;color:#555;">Please present your ticket QR code at the gate for entry.</p>

        ${
          qrCid
            ? `
        <div style="text-align:center;margin:18px 0 8px">
          <img src="cid:${qrCid}" alt="Ticket QR" width="220" height="220" style="display:inline-block;border:8px solid #f1f1f1;border-radius:12px" />
          <div style="font-size:12px;color:#777;margin-top:6px">Scan at the gate • Ref: ${ref}</div>
        </div>`
            : ''
        }

        <h3 style="color:#1E90FF;margin-top:25px;font-size:18px;">Booking Details</h3>
        <table style="border-collapse:collapse;width:100%;margin-top:20px;background:#f9f9f9;border-radius:8px;">
          <tr style="background:#e1f5fe;"><td style="border:1px solid #ddd;padding:12px;font-weight:600">Trip Name</td><td style="border:1px solid #ddd;padding:12px">${trip?.name ?? "Adventure Day"}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff">Booking Date</td><td style="border:1px solid #ddd;padding:12px">${new Date(bookingDate).toLocaleString("en-US")}</td></tr>
          <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px">Adults</td><td style="border:1px solid #ddd;padding:12px">${adult}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff">Children</td><td style="border:1px solid #ddd;padding:12px">${child}</td></tr>
          <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px">Transportation</td><td style="border:1px solid #ddd;padding:12px">${transportation ? "Yes" : "No"}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:12px;background:#f1f7ff;color:#e60000">Total (EGP)</td><td style="border:1px solid #ddd;padding:12px"><b style="color:#e60000">${Number(egp).toFixed(2)}</b></td></tr>
          <tr style="background:#f1f7ff"><td style="border:1px solid #ddd;padding:12px;color:#e60000">Total (EUR)</td><td style="border:1px solid #ddd;padding:12px"><b style="color:#e60000">${Number(euro).toFixed(2)}</b></td></tr>
        </table>

        <h3 style="color:#1E90FF;margin-top:25px;font-size:18px;">Client Information</h3>
        <p>
          📧 Email: <a href="mailto:${email}" style="color:#1E90FF">${email}</a><br/>
          📞 Mobile: <span style="color:#333">${phone}</span><br/>
          ${message ? `<span style="color:#555">📝 Message: ${message}</span>` : ""}
        </p>

        <p style="margin-top:25px;font-size:16px;color:#555;">If you have any questions, simply reply to this email. ✉️</p>
      </div>

      <div style="background:#f1f1f1;padding:15px 30px;font-size:12px;color:#666;text-align:center;border-bottom-left-radius:8px;border-bottom-right-radius:8px">
        Ticket Reference: <b>${ref}</b>
      </div>
    </div>
  </div>
`;
}


// export async function sendBookingEmail({ to, subject, html, bcc }) {
//   return transporter.sendMail({
//     from: `"Support" <${process.env.MAIL_FROM}>`,
//     to,
//     bcc: process.env.ADMIN_BCC || bcc, // اختياري: نسخة للأدمن
//     subject,
//     html,
//   });
// }

export async function sendBookingEmail({ to, subject, html, bcc, attachments }) {
  return transporter.sendMail({
    from: `"Support" <${process.env.MAIL_FROM}>`,
    to,
    bcc: process.env.ADMIN_BCC || bcc,
    subject,
    html,
    attachments, 
  });
}

////////////////////////////////
