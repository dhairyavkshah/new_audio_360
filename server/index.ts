import express, { Request, Response, NextFunction } from 'express';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { users, subscriptions } from './schema';
import { eq } from 'drizzle-orm';
import path from 'path';

const app = express();
app.use(express.json());

app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets')));

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

function normalizePlan(plan: string): 'free' | 'premium' {
  return (plan === 'standard' || plan === 'premium') ? 'premium' : 'free';
}

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
        plan: subscription[0].isActive ? normalizePlan(subscription[0].plan) : 'free',
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
        plan: subscription[0].isActive ? normalizePlan(subscription[0].plan) : 'free',
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

    const validProductIds = ['new_audio_360_premium_monthly', 'new_audio_360_premium_annual'];
    if (!validProductIds.includes(productId)) {
      console.warn(`Invalid product ID attempted: ${productId}`);
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const subscriptionType = productId.includes('annual') ? 'annual' : 'monthly';

    let subscriptionData;
    try {
      subscriptionData = await verifyGooglePlaySubscription(packageName, productId, purchaseToken);
    } catch (verifyError) {
      console.error('Google Play verification error:', verifyError);
      return res.status(400).json({ error: 'Invalid purchase or subscription expired' });
    }

    const plan = 'premium';
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
    const normalizedPlan = normalizePlan(sub.plan);

    if (sub.isActive !== isActive) {
      await db.update(subscriptions)
        .set({ isActive })
        .where(eq(subscriptions.userId, req.userId!));
    }

    const entitlement = jwt.sign(
      {
        userId: req.userId,
        plan: isActive ? normalizedPlan : 'free',
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
        plan: isActive ? normalizedPlan : 'free',
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

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-dev-key-change-in-production';

const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin API key' });
  }
  next();
};

app.get('/api/admin/users', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(users.createdAt);
    
    const usersWithSubscriptions = await Promise.all(
      allUsers.map(async (user) => {
        const subscription = await db.select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, user.id))
          .limit(1);
        
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          subscription: subscription.length > 0 ? {
            plan: subscription[0].isActive ? normalizePlan(subscription[0].plan) : 'free',
            isActive: subscription[0].isActive,
            expiresAt: subscription[0].expiresAt,
          } : {
            plan: 'free',
            isActive: false,
            expiresAt: null,
          },
        };
      })
    );
    
    res.json({
      success: true,
      users: usersWithSubscriptions,
      total: usersWithSubscriptions.length,
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    const allSubscriptions = await db.select().from(subscriptions);
    
    const premiumCount = allSubscriptions.filter(s => (s.plan === 'premium' || s.plan === 'standard') && s.isActive).length;
    const freeCount = allUsers.length - premiumCount;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = allUsers.filter(u => u.createdAt >= today).length;
    
    res.json({
      success: true,
      stats: {
        totalUsers: allUsers.length,
        premiumUsers: premiumCount,
        freeUsers: freeCount,
        newUsersToday,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/admin', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Audio 360 - Admin Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #fff; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 24px; }
    .auth-form { background: #1a1a1a; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .auth-form input { width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #252525; color: #fff; font-size: 14px; margin-bottom: 12px; }
    .auth-form button { padding: 12px 24px; background: #0078d4; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
    .auth-form button:hover { background: #106ebe; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #1a1a1a; padding: 20px; border-radius: 12px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #0078d4; }
    .stat-label { color: #888; font-size: 14px; margin-top: 4px; }
    .users-table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 12px; overflow: hidden; }
    .users-table th, .users-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #252525; }
    .users-table th { background: #252525; font-weight: 600; font-size: 13px; color: #888; text-transform: uppercase; }
    .users-table tr:hover { background: #252525; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-premium { background: #ffc107; color: #000; }
    .badge-free { background: #333; color: #888; }
    .user-info { display: flex; align-items: center; gap: 12px; }
    .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: #333; }
    .hidden { display: none; }
    .error { color: #ff4444; margin-top: 8px; }
    @media (max-width: 768px) { .users-table { font-size: 13px; } .users-table th, .users-table td { padding: 10px 8px; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>New Audio 360 Admin</h1>
    <p class="subtitle">User Management Dashboard</p>
    
    <div class="auth-form" id="authForm">
      <input type="password" id="apiKey" placeholder="Enter Admin API Key" />
      <button onclick="authenticate()">Access Dashboard</button>
      <p class="error hidden" id="authError"></p>
    </div>
    
    <div id="dashboard" class="hidden">
      <div class="stats" id="stats"></div>
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Joined</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody id="usersTableBody"></tbody>
      </table>
    </div>
  </div>
  
  <script>
    let adminKey = '';
    
    async function authenticate() {
      adminKey = document.getElementById('apiKey').value;
      const errorEl = document.getElementById('authError');
      
      try {
        const res = await fetch('/api/admin/users', { headers: { 'x-admin-api-key': adminKey } });
        if (!res.ok) throw new Error('Invalid API key');
        
        document.getElementById('authForm').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadDashboard();
      } catch (e) {
        errorEl.textContent = 'Invalid API key. Please try again.';
        errorEl.classList.remove('hidden');
      }
    }
    
    async function loadDashboard() {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-admin-api-key': adminKey } }),
        fetch('/api/admin/users', { headers: { 'x-admin-api-key': adminKey } })
      ]);
      
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      
      document.getElementById('stats').innerHTML = \`
        <div class="stat-card"><div class="stat-value">\${statsData.stats.totalUsers}</div><div class="stat-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-value">\${statsData.stats.premiumUsers}</div><div class="stat-label">Premium Users</div></div>
        <div class="stat-card"><div class="stat-value">\${statsData.stats.freeUsers}</div><div class="stat-label">Free Users</div></div>
        <div class="stat-card"><div class="stat-value">\${statsData.stats.newUsersToday}</div><div class="stat-label">New Today</div></div>
      \`;
      
      document.getElementById('usersTableBody').innerHTML = usersData.users.map(u => \`
        <tr>
          <td><div class="user-info"><img class="user-avatar" src="\${u.photoUrl || ''}" onerror="this.style.display='none'" /><span>\${u.displayName || 'No name'}</span></div></td>
          <td>\${u.email}</td>
          <td><span class="badge \${u.subscription.plan === 'premium' ? 'badge-premium' : 'badge-free'}">\${u.subscription.plan.toUpperCase()}</span></td>
          <td>\${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>\${new Date(u.lastLoginAt).toLocaleDateString()}</td>
        </tr>
      \`).join('');
    }
  </script>
</body>
</html>
  `);
});

const VALID_PRODUCT_IDS = [
  'new_audio_360_premium_monthly',
  'new_audio_360_premium_annual',
];

async function verifyGooglePlaySubscription(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string
): Promise<{ expiryTimeMillis?: string; paymentState?: number; subscriptionType?: 'monthly' | 'annual' }> {
  const subscriptionType = subscriptionId.includes('annual') ? 'annual' : 'monthly';
  
  if (!VALID_PRODUCT_IDS.includes(subscriptionId)) {
    throw new Error(`Invalid product ID: ${subscriptionId}`);
  }

  if (!GOOGLE_PLAY_SERVICE_ACCOUNT) {
    console.warn('Google Play service account not configured, using mock verification');
    const expiryDuration = subscriptionType === 'annual' 
      ? 365 * 24 * 60 * 60 * 1000 
      : 30 * 24 * 60 * 60 * 1000;
    return {
      expiryTimeMillis: String(Date.now() + expiryDuration),
      paymentState: 1,
      subscriptionType,
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
    subscriptionType,
  };
}

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
