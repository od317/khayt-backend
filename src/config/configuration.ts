export type NodeEnv = 'development' | 'staging' | 'production' | 'test';

export type AppConfig = {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    secret: string;
    accessExpires: string;
    refreshExpires: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  superAdmin: {
    email: string | null;
    password: string | null;
  };
  debugAllowInProduction: boolean;
  swaggerEnabled: boolean;
  corsOrigins: string[];
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  } | null;
  orderSupport: {
    whatsapp: string;
    phone: string;
  };
};

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const firebaseFromEnv = (): AppConfig['firebase'] => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  const nodeEnv = (process.env.NODE_ENV as NodeEnv) ?? 'development';
  if (nodeEnv === 'production') {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY',
    );
  }

  return null;
};

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as NodeEnv) ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '7d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },
  smtp: {
    host: required('SMTP_HOST'),
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
    from: process.env.SMTP_FROM ?? required('SMTP_USER'),
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? null,
    password: process.env.SUPER_ADMIN_PASSWORD ?? null,
  },
  debugAllowInProduction: process.env.DEBUG_ALLOW_IN_PRODUCTION === 'true',
  swaggerEnabled:
    process.env.SWAGGER_ENABLED === 'true' ||
    ((process.env.NODE_ENV as NodeEnv | undefined) ?? 'development') !==
      'production',
  corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
  firebase: firebaseFromEnv(),
  orderSupport: {
    whatsapp: process.env.ORDER_WHATSAPP ?? '',
    phone: process.env.ORDER_PHONE ?? '',
  },
});
