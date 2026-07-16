import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { isEmailEnabled, sendVerificationEmail, sendResetPasswordEmail } from "@/lib/email";

// Email verification + password reset only turn on once RESEND_API_KEY is set.
// Without it, registration behaves as before (instant access, no email) so the
// app never breaks if email delivery isn't configured yet.
const emailEnabled = isEmailEnabled();

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailEnabled,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: emailEnabled,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  plugins: [nextCookies()],
});
