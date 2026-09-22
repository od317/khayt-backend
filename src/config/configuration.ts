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
  corsOrigins: string[];
};

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as NodeEnv) ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },
  corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
});
