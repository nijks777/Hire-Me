import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    // Validation
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { message: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return NextResponse.json(
        { message: "Invalid OTP format" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find user with reset token
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      return NextResponse.json(
        { message: "Invalid or expired reset request" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > user.passwordResetExpires) {
      return NextResponse.json(
        { message: "OTP has expired. Please request a new one" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isOtpValid = await verifyPassword(otp, user.passwordResetToken);

    if (!isOtpValid) {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
