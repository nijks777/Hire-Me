import { Resend } from 'resend';

export async function sendPasswordResetEmail(email: string, otp: string) {
  try {
    // Initialize Resend inside the function to ensure env vars are loaded
    const apiKey = process.env.RESEND_API_KEY;

    console.log(`📧 [email.ts] Sending password reset email...`);
    console.log(`📧 [email.ts] From: Hire-Me <onboarding@resend.dev>`);
    console.log(`📧 [email.ts] To: Jalaj.ka.sharma@gmail.com`);
    console.log(`📧 [email.ts] OTP: ${otp}`);
    console.log(`📧 [email.ts] API Key present: ${apiKey ? 'YES' : 'NO'}`);
    console.log(`📧 [email.ts] API Key value: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);

    if (!apiKey) {
      console.error('❌ [email.ts] RESEND_API_KEY is not set in environment variables!');
      return false;
    }

    const resend = new Resend(apiKey);

    // NOTE: With test domain, emails only go to Jalaj.ka.sharma@gmail.com
    // To send to other emails, verify a domain at resend.com/domains
    const { data, error } = await resend.emails.send({
      from: 'Hire-Me <onboarding@resend.dev>',
      to: ['Jalaj.ka.sharma@gmail.com'], // Test domain restriction - use exact case from DB
      subject: 'Password Reset OTP - Hire-Me',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Password reset requested for: <strong>${email}</strong></p>
              <p>Use the OTP below to complete the process:</p>

              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>

              <p><strong>This OTP will expire in 10 minutes.</strong></p>

              <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>

              <p>Best regards,<br>The Hire-Me Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ [email.ts] Resend API error:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`✅ [email.ts] Password reset email sent successfully!`);
    console.log(`📬 [email.ts] Email ID: ${data?.id}`);
    console.log(`📬 [email.ts] Full response:`, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ [email.ts] Exception while sending email:', error);
    return false;
  }
}
