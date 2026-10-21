/**
 * Transactional Email HTML & Text Templates for EduBD Platform
 */

export interface BaseTemplateOptions {
  title: string;
  preheader?: string;
  contentHtml: string;
}

export function baseEmailTemplate({ title, preheader, contentHtml }: BaseTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 28px;
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #059669;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25);
    }
    .callout {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 14px 18px;
      margin: 20px 0;
      border-radius: 6px;
      font-size: 13px;
      color: #065f46;
    }
    .callout-warning {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 18px;
      margin: 20px 0;
      border-radius: 6px;
      font-size: 13px;
      color: #92400e;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #059669;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;">${preheader}</span>` : ""}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>EduBD</h1>
        <p>Learn • Practice • Test • Succeed</p>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} EduBD Educational Learning Platform. সর্বস্বত্ব সংরক্ষিত।</p>
        <p>কোনো জিজ্ঞাসা থাকলে সহায়তা নিন: <a href="mailto:support@edubd.ac">support@edubd.ac</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function getPasswordResetTemplate(data: {
  name: string;
  resetUrl: string;
  expiresMinutes?: number;
  ipAddress?: string;
}) {
  const expires = data.expiresMinutes || 60;
  const contentHtml = `
    <h2 style="margin-top:0; color:#0f172a; font-size:18px;">পাসওয়ার্ড রিসেট অনুরোধ / Password Reset Request</h2>
    <p>আসসালামু আলাইকুম <strong>${data.name}</strong>,</p>
    <p>আপনার EduBD অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তনের জন্য একটি অনুরোধ করা হয়েছে। নতুন পাসওয়ার্ড নির্ধারণ করতে নিচের বাটনে ক্লিক করুন:</p>

    <div class="btn-container">
      <a href="${data.resetUrl}" class="btn" target="_blank">পাসওয়ার্ড রিসেট করুন (Reset Password)</a>
    </div>

    <p style="font-size:13px; color:#64748b;">বাটনে ক্লিক করতে সমস্যা হলে নিচের লিংকটি কপি করে আপনার ব্রাউজারে পেস্ট করুন:</p>
    <p style="font-size:12px; word-break:break-all; background:#f1f5f9; padding:10px; border-radius:6px; color:#334155;">
      <a href="${data.resetUrl}" style="color:#059669;">${data.resetUrl}</a>
    </p>

    <div class="callout-warning">
      <strong>নিরাপত্তা সতর্কবার্তা:</strong> এই লিংকটি পরবর্তী <strong>${expires} মিনিটের</strong> জন্য বৈধ থাকবে এবং শুধুমাত্র একবার ব্যবহার করা যাবে। আপনি যদি এই অনুরোধ না করে থাকেন, তবে কোনো পদক্ষেপ নেওয়ার প্রয়োজন নেই।
      ${data.ipAddress ? `<br><span style="font-size:11px; opacity:0.8;">অনুরোধকারী আইপি: ${data.ipAddress}</span>` : ""}
    </div>
  `;

  return {
    subject: "পাসওয়ার্ড রিসেট লিংক | Password Reset Request - EduBD",
    html: baseEmailTemplate({
      title: "পাসওয়ার্ড রিসেট - EduBD",
      preheader: "আপনার EduBD অ্যাকাউন্টের পাসওয়ার্ড রিসেট করুন",
      contentHtml,
    }),
    text: `আসসালামু আলাইকুম ${data.name},\n\nআপনার EduBD পাসওয়ার্ড রিসেট করার লিংক:\n${data.resetUrl}\n\nএই লিংকটি ${expires} মিনিটের জন্য কার্যকর থাকবে।\n\n- EduBD টিম`,
  };
}

export function getAccountVerificationTemplate(data: {
  name: string;
  verifyUrl: string;
}) {
  const contentHtml = `
    <h2 style="margin-top:0; color:#0f172a; font-size:18px;">EduBD-তে আপনাকে স্বাগতম! Welcome to EduBD</h2>
    <p>আসসালামু আলাইকুম <strong>${data.name}</strong>,</p>
    <p>EduBD প্ল্যাটফর্মে অ্যাকাউন্ট খোলার জন্য ধন্যবাদ। আপনার ইমেইল ঠিকানাটি নিশ্চিত করতে নিচের বাটনে ক্লিক করুন:</p>

    <div class="btn-container">
      <a href="${data.verifyUrl}" class="btn" target="_blank">ইমেইল নিশ্চিত করুন (Verify Email)</a>
    </div>

    <div class="callout">
      ইমেইল ভেরিফিকেশনের মাধ্যমে আপনি আনলিমিটেড ফ্রি মডেল টেস্ট, প্র্যাকটিস সেশন এবং পারফরম্যান্স অ্যানালিটিক্স অ্যাক্সেস করতে পারবেন।
    </div>
  `;

  return {
    subject: "আপনার EduBD অ্যাকাউন্ট নিশ্চিত করুন | Verify Your Account",
    html: baseEmailTemplate({
      title: "ইমেইল ভেরিফিকেশন - EduBD",
      preheader: "EduBD অ্যাকাউন্টের ইমেইল ঠিকানা নিশ্চিত করুন",
      contentHtml,
    }),
    text: `আসসালামু আলাইকুম ${data.name},\n\nEduBD-তে আপনার ইমেইল নিশ্চিত করার লিংক:\n${data.verifyUrl}\n\n- EduBD টিম`,
  };
}

export function getQuestionReportResolvedTemplate(data: {
  name: string;
  questionText: string;
  reasonText: string;
  adminNotes?: string | null;
}) {
  const contentHtml = `
    <h2 style="margin-top:0; color:#0f172a; font-size:18px;">রিপোর্টকৃত প্রশ্নের পর্যালোচনা সম্পন্ন হয়েছে</h2>
    <p>আসসালামু আলাইকুম <strong>${data.name}</strong>,</p>
    <p>EduBD প্রশ্ন ব্যাংকের মান উন্নয়নে সহায়তা করার জন্য আপনাকে ধন্যবাদ। আপনার রিপোর্টকৃত প্রশ্নটি আমাদের একাডেমিক কোয়ালিটি টিম পর্যালোচনা করেছে এবং সমাধান সম্পন্ন করেছে।</p>

    <div class="callout">
      <strong>প্রশ্নের বিষয়বস্তু:</strong> ${data.questionText.slice(0, 100)}${data.questionText.length > 100 ? "..." : ""}<br>
      <strong>রিপোর্টের কারণ:</strong> ${data.reasonText}
      ${data.adminNotes ? `<br><br><strong>পর্যালোচকের সমাধান নোট:</strong> ${data.adminNotes}` : ""}
    </div>

    <p>আপনার সহযোগিতা আমাদের প্ল্যাটফর্মকে সকল শিক্ষার্থীর জন্য আরও নির্ভুল ও সমৃদ্ধ করতে সহায়তা করে।</p>
  `;

  return {
    subject: "আপনার রিপোর্টকৃত প্রশ্নটি সমাধান করা হয়েছে | Question Issue Resolved - EduBD",
    html: baseEmailTemplate({
      title: "রিপোর্ট সমাধান - EduBD",
      preheader: "আপনার রিপোর্টকৃত প্রশ্নের সমাধান সম্পন্ন হয়েছে",
      contentHtml,
    }),
    text: `আসসালামু আলাইকুম ${data.name},\n\nআপনার রিপোর্টকৃত প্রশ্নটি আমাদের একাডেমিক টিম সমাধান করেছে।\nপর্যালোচকের নোট: ${data.adminNotes || "সমাধান সম্পন্ন"}\n\nধন্যবাদ,\nEduBD টিম`,
  };
}

export function getTestEmailTemplate(data: {
  recipientEmail: string;
  provider: string;
  configuredHost?: string;
}) {
  const contentHtml = `
    <h2 style="margin-top:0; color:#0f172a; font-size:18px;">ইমেইল সার্ভার সফলভাবে সংযুক্ত হয়েছে! (Email Test Successful)</h2>
    <p>অভিনন্দন! আপনার EduBD প্ল্যাটফর্মের ট্রানজ্যাকশনাল ইমেইল সার্ভিস সঠিকভাবে কাজ করছে।</p>

    <div class="callout">
      <strong>কনফিগারেশন বিবরণ:</strong><br>
      • প্রোভাইডার মোড: <strong>${data.provider}</strong><br>
      • সার্ভার হোস্ট: <strong>${data.configuredHost || "Default SMTP / API"}</strong><br>
      • টেস্ট প্রাপক: <strong>${data.recipientEmail}</strong><br>
      • প্রেরণের সময়: <strong>${new Date().toLocaleString("bn-BD")}</strong>
    </div>

    <p style="font-size:13px; color:#64748b;">এখন থেকে পাসওয়ার্ড রিসেট লিংক, অ্যাক্টিভেশন ইমেইল এবং প্রশাসনিক নোটিফিকেশন স্বয়ংক্রিয়ভাবে প্রেরিত হবে।</p>
  `;

  return {
    subject: "EduBD ইমেইল কনফিগারেশন টেস্ট সফল | Email Setup Verified",
    html: baseEmailTemplate({
      title: "ইমেইল টেস্ট সফল - EduBD",
      preheader: "EduBD ট্রানজ্যাকশনাল ইমেইল সফলভাবে সংযুক্ত",
      contentHtml,
    }),
    text: `অভিনন্দন! আপনার EduBD প্ল্যাটফর্মের ট্রানজ্যাকশনাল ইমেইল সার্ভিস (${data.provider}) সঠিকভাবে সংযুক্ত হয়েছে।`,
  };
}
