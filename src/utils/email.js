import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter;

try {
  const mailConfig = {
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
  };
  
  if (config.mail.user && config.mail.pass) {
    mailConfig.auth = {
      user: config.mail.user,
      pass: config.mail.pass,
    };
  }

  transporter = nodemailer.createTransport(mailConfig);
} catch (err) {
  console.error('⚠️ Failed to initialize nodemailer transporter:', err.message);
}

/**
 * Send quiz matches email to student
 * @param {string} toEmail 
 * @param {Array<{ careerId: string, title: string, matchPercent: number, reason: string }>} matches 
 */
export async function sendQuizResultsEmail(toEmail, matches) {
  if (!toEmail) return;

  // Graceful fallback for local development without SMTP config
  if (!config.mail.user || !config.mail.pass) {
    console.log('\n✉️  [LOCAL DEV EMAIL CAPTURE] ────────────────────────────────');
    console.log(`To: ${toEmail}`);
    console.log('Subject: Your Top Career Matches - ATYANT Counselling');
    console.log('Matches:');
    matches.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.title || m.careerId} (${m.matchPercent}% Match)`);
      console.log(`     Reason: ${m.reason}`);
    });
    console.log('──────────────────────────────────────────────────────────\n');
    return;
  }

  const rankColors = ['#FF6B2B', '#7C3AED', '#0EA5E9'];

  // Build match HTML elements
  const matchesHtml = matches.map((m, i) => {
    const color = rankColors[i] || '#FF6B2B';
    const exploreUrl = `${config.frontendUrl}/careers/${m.careerId}`;
    return `
      <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px; position: relative;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td style="background-color: ${color}; color: #ffffff; font-weight: 900; font-size: 14px; border-radius: 50%; width: 28px; height: 28px; text-align: center; line-height: 28px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${i + 1}
                  </td>
                  <td style="padding-left: 12px; font-size: 18px; font-weight: 800; color: #ffffff; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${m.title || m.careerId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; line-height: 1.6; color: #a0aec0; margin: 0 0 16px 0; font-family: Arial, sans-serif;">
                ${m.reason}
              </p>
              <a href="${exploreUrl}" target="_blank" style="display: inline-block; font-size: 13px; font-weight: 700; color: #FF6B2B; text-decoration: none; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                Explore this career path &rarr;
              </a>
            </td>
            <td width="90" align="right" valign="top" style="padding-left: 15px;">
              <div style="width: 80px; height: 80px; border-radius: 50%; border: 5px solid rgba(255,255,255,0.08); border-top-color: #FF6B2B; position: relative; text-align: center;">
                <div style="padding-top: 22px;">
                  <span style="font-size: 18px; font-weight: 900; color: #ffffff; display: block; line-height: 1; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${m.matchPercent}%</span>
                  <span style="font-size: 9px; color: #718096; display: block; margin-top: 2px; text-transform: uppercase; font-family: Arial, sans-serif;">Match</span>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Top Career Matches</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0B0F2E; color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F2E; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" class="container" style="max-width: 600px; text-align: left;">
                
                <!-- Logo / Header -->
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <div style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 1px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      ATYANT<span style="color: #FF6B2B;">.</span>
                    </div>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding-bottom: 24px; text-align: center;">
                    <h1 style="font-size: 28px; font-weight: 900; color: #ffffff; margin: 0 0 10px 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">Your Top Career Matches</h1>
                    <p style="font-size: 15px; color: #a0aec0; margin: 0; line-height: 1.5; font-family: Arial, sans-serif;">
                      Based on your answers to the Atyant Career Fit Quiz, here are the 3 fields that suit you best.
                    </p>
                  </td>
                </tr>

                <!-- Matches List -->
                <tr>
                  <td>
                    ${matchesHtml}
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding: 20px 0 40px 0;">
                    <a href="${config.frontendUrl}/roadmap" target="_blank" style="display: inline-block; background-color: #FF6B2B; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(255, 107, 43, 0.3); font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                      Explore all 30 Career Paths
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; text-align: center;">
                    <p style="font-size: 12px; color: #718096; margin: 0 0 8px 0; font-family: Arial, sans-serif;">
                      Sent with ♥ by ATYANT Counselling
                    </p>
                    <p style="font-size: 11px; color: #4a5568; margin: 0; font-family: Arial, sans-serif;">
                      If you have questions, please reach out to us at support@atyant.in.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: config.mail.from,
    to: toEmail,
    subject: '🎯 Your Top Career Matches - ATYANT Counselling',
    html: htmlContent,
  });
}
