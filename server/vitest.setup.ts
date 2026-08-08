process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/testpilot_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-only-jwt-secret-not-for-prod";
process.env.NODE_ENV = "test";
