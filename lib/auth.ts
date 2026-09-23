import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

// NextAuth requires a secret. Provide a resilient fallback so the app never crashes with a server error
const secret = process.env.NEXTAUTH_SECRET || 'clearview-window-cleaning-secure-secret-key-9988';

const providers = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  );
} else {
  // Fallback dummy provider to prevent NextAuth from throwing Configuration Error on initial boot
  providers.push(
    GoogleProvider({
      clientId: 'dummy-client-id',
      clientSecret: 'dummy-client-secret',
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
      }

      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/', // Redirect back to home instead of showing the default black error screen
  },
  secret,
};

async function refreshAccessToken(token: any) {
  try {
    if (!googleClientId || !googleClientSecret || !token.refreshToken) {
      return token;
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in ?? 3600) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
