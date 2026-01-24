/**
 * NextAuth.js API Route Handler
 *
 * This is the main authentication API endpoint that handles:
 * - Sign in requests
 * - Sign out requests
 * - Session management
 * - Callback handling
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
