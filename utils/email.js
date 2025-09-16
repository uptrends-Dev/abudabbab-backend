import "dotenv/config"; // process.env

// utils/email.js
import nodemailer from "nodemailer";

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
export function bookingEmailHtml(booking, trip) {
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
  <div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;background:#f9f9f9;padding:20px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
      
      <div style="background:#007BFF;color:#fff;padding:16px 20px">
        <h2 style="margin:0;font-size:20px">🎟️ تأكيد الحجز</h2>
        <p style="margin:0;font-size:14px">رقم التذكرة: <b style="color:#FFD700">${ref}</b></p>
      </div>

      <div style="padding:20px;color:#333;line-height:1.6">
        <p>أهلاً <b>${firstName} ${lastName}</b>، تم استلام حجزك بنجاح ✅</p>

        <h3 style="color:#007BFF;margin-top:20px">بيانات الرحلة</h3>
        <table style="border-collapse:collapse;width:100%;margin-top:10px">
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff">اسم الرحلة</td><td style="border:1px solid #ddd;padding:10px">${trip?.name ?? "رحلة"}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff">تاريخ الحجز</td><td style="border:1px solid #ddd;padding:10px">${new Date(bookingDate).toLocaleString("ar-EG")}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff">بالغين</td><td style="border:1px solid #ddd;padding:10px">${adult}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff">أطفال</td><td style="border:1px solid #ddd;padding:10px">${child}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff">النقل</td><td style="border:1px solid #ddd;padding:10px">${transportation ? "نعم" : "لا"}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff;color:#e60000">الإجمالي (EGP)</td><td style="border:1px solid #ddd;padding:10px"><b style="color:#e60000">${Number(egp).toFixed(2)}</b></td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f1f7ff;color:#e60000">الإجمالي (EUR)</td><td style="border:1px solid #ddd;padding:10px"><b style="color:#e60000">${Number(euro).toFixed(2)}</b></td></tr>
        </table>

        <h3 style="color:#007BFF;margin-top:20px">بيانات العميل</h3>
        <p>
          📧 الإيميل: <a href="mailto:${email}" style="color:#007BFF">${email}</a><br/>
          📞 الموبايل: <span style="color:#333">${phone}</span><br/>
          ${message ? `<span style="color:#555">📝 ملاحظة: ${message}</span>` : ""}
        </p>

        <p style="margin-top:20px">لو عندك أي استفسار، ابعت رد على نفس الإيميل ✉️</p>
      </div>

      <div style="background:#f1f1f1;padding:12px 20px;font-size:12px;color:#666;text-align:center">
        رقم التذكرة: <b>${ref}</b> | معرف الحجز: ${_id}
      </div>
    </div>
  </div>
  `;
}


export async function sendBookingEmail({ to, subject, html, bcc }) {
  return transporter.sendMail({
    from: `"Support" <${process.env.MAIL_FROM}>`,
    to,
    bcc: process.env.ADMIN_BCC || bcc, // اختياري: نسخة للأدمن
    subject,
    html,
  });
}
