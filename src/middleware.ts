import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // Only allow authenticated users to access protected routes
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};