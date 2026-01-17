import express, { Request, Response, NextFunction } from 'express';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { users, subscriptions } from './schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_PLAY_SERVICE_ACCOUNT = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '';

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required but not set.');
  console.error('Generate a secure secret with: openssl rand -base64 32');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await db.select().from(users).where(eq(users.googleId, googleId!)).limit(1);

    if (user.length === 0) {
      const inserted = await db.insert(users).values({
        googleId: googleId!,
        email: email!,
        displayName: name || null,
        photoUrl: picture || null,
      }).returning();
      user = inserted;
    } else {
      await db.update(users)
        .set({
          email: email!,
          displayName: name || null,
          photoUrl: picture || null,
          lastLoginAt: new Date(),
        })
        .where(eq(users.googleId, googleId!));
    }

    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user[0].id))
      .limit(1);

    const accessToken = jwt.sign(
      { userId: user[0].id, email: user[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user[0].id, email: user[0].email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        displayName: user[0].displayName,
        photoUrl: user[0].photoUrl,
      },
      subscription: subscription.length > 0 ? {
        plan: subscription[0].plan,
        isActive: subscription[0].isActive,
        expiresAt: subscription[0].expiresAt,
      } : {
        plan: 'free',
        isActive: false,
        expiresAt: null,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user[0].id))
      .limit(1);

    const newAccessToken = jwt.sign(
      { userId: user[0].id, email: user[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        displayName: user[0].displayName,
        photoUrl: user[0].photoUrl,
      },
      subscription: subscription.length > 0 ? {
        plan: subscription[0].plan,
        isActive: subscription[0].isActive,
        expiresAt: subscription[0].expiresAt,
      } : {
        plan: 'free',
        isActive: false,
        expiresAt: null,
      },
      tokens: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

app.post('/api/subscription/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { purchaseToken, productId, packageName } = req.body;

    if (!purchaseToken || !productId || !packageName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let subscriptionData;
    try {
      subscriptionData = await verifyGooglePlaySubscription(packageName, productId, purchaseToken);
    } catch (verifyError) {
      console.error('Google Play verification error:', verifyError);
      return res.status(400).json({ error: 'Invalid purchase or subscription expired' });
    }

    const plan = productId.includes('premium') ? 'premium' : 'standard';
    const expiresAt = subscriptionData.expiryTimeMillis 
      ? new Date(parseInt(subscriptionData.expiryTimeMillis))
      : null;
    const isActive = subscriptionData.paymentState === 1 || 
                     Boolean(subscriptionData.expiryTimeMillis && 
                      parseInt(subscriptionData.expiryTimeMillis) > Date.now());

    const existingSub = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.userId!))
      .limit(1);

    if (existingSub.length > 0) {
      await db.update(subscriptions)
        .set({
          plan,
          purchaseToken,
          productId,
          isActive,
          expiresAt,
          lastVerifiedAt: new Date(),
        })
        .where(eq(subscriptions.userId, req.userId!));
    } else {
      await db.insert(subscriptions).values({
        userId: req.userId!,
        plan,
        purchaseToken,
        productId,
        isActive,
        expiresAt,
        lastVerifiedAt: new Date(),
      });
    }

    const entitlement = jwt.sign(
      {
        userId: req.userId,
        plan,
        isActive,
        expiresAt: expiresAt?.toISOString(),
        verifiedAt: new Date().toISOString(),
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      subscription: {
        plan,
        isActive,
        expiresAt,
      },
      entitlement,
    });
  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({ error: 'Subscription verification failed' });
  }
});

app.get('/api/subscription/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.userId!))
      .limit(1);

    if (subscription.length === 0) {
      return res.json({
        success: true,
        subscription: {
          plan: 'free',
          isActive: false,
          expiresAt: null,
        },
      });
    }

    const sub = subscription[0];
    const isActive = sub.isActive && (!sub.expiresAt || sub.expiresAt > new Date());

    if (sub.isActive !== isActive) {
      await db.update(subscriptions)
        .set({ isActive })
        .where(eq(subscriptions.userId, req.userId!));
    }

    const entitlement = jwt.sign(
      {
        userId: req.userId,
        plan: isActive ? sub.plan : 'free',
        isActive,
        expiresAt: sub.expiresAt?.toISOString(),
        verifiedAt: new Date().toISOString(),
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      subscription: {
        plan: isActive ? sub.plan : 'free',
        isActive,
        expiresAt: sub.expiresAt,
      },
      entitlement,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function verifyGooglePlaySubscription(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string
): Promise<{ expiryTimeMillis?: string; paymentState?: number }> {
  if (!GOOGLE_PLAY_SERVICE_ACCOUNT) {
    console.warn('Google Play service account not configured, using mock verification');
    return {
      expiryTimeMillis: String(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentState: 1,
    };
  }

  const { google } = await import('googleapis');
  const serviceAccount = JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT);
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId,
    token: purchaseToken,
  });

  return {
    expiryTimeMillis: response.data.expiryTimeMillis || undefined,
    paymentState: response.data.paymentState || undefined,
  };
}

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
