import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // We don't want to reveal if a user exists or not
      return NextResponse.json({ message: "If an account with that email exists, a password reset OTP has been sent." });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash the OTP
    const hashedOtp = await hashPassword(otp);

    // Set an expiry time (10 minutes from now)
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    // Update user with hashed OTP and expiry
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: hashedOtp,
        passwordResetExpires: expires,
      },
    });

    // Send OTP via email
    const emailSent = await sendPasswordResetEmail(email, otp);

    if (!emailSent) {
      console.error(`Failed to send email to ${email}, but OTP was generated: ${otp}`);
    }

    // Log OTP to console as backup (remove in production)
    console.log(`Password reset OTP for ${email}: ${otp}`);

    return NextResponse.json({ message: "If an account with that email exists, a password reset OTP has been sent." });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
