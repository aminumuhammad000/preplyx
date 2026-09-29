import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { securityHeaders, generalApiLimiter } from './middlewares/securityMiddleware';

const app: Application = express();

// Security Headers
app.use(securityHeaders);

// CORS configuration with environment-aware and subdomain validation
const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((val) => (val as string).split(',').map((o) => o.trim()))
  .filter(Boolean);

const defaultAllowedOrigins = [
  'https://preplyx.com.ng',
  'https://www.preplyx.com.ng',
  'https://dash.preplyx.com.ng',
  'https://app.preplyx.com.ng',
  'https://admin.preplyx.com.ng',
  'https://api.preplyx.com.ng',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5004',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5004',
];

const staticAllowedSet = new Set([...envOrigins, ...defaultAllowedOrigins]);

const isOriginAllowed = (origin?: string): boolean => {
  // Allow non-browser requests (mobile apps, Postman, server-to-server, curl)
  if (!origin) return true;
  // Allow all origins during development and testing
  if (process.env.NODE_ENV !== 'production') return true;
  // Match explicit list
  if (staticAllowedSet.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    // Allow preplyx.com.ng and any subdomain (dash.preplyx.com.ng, etc.)
    if (parsed.hostname === 'preplyx.com.ng' || parsed.hostname.endsWith('.preplyx.com.ng')) {
      return true;
    }
    // Allow Vercel preview environments
    if (parsed.hostname.endsWith('.vercel.app')) {
      return true;
    }
    // Allow localhost on any port in case of alternative port usage
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Reject origin cleanly without throwing 500 error on preflight
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Payload size limit to prevent buffer overflow attacks
app.use(express.json({ limit: '2mb' }));

// General API Rate Limiter
app.use('/api', generalApiLimiter);

// Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
