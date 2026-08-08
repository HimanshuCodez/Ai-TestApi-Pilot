import { describe, it, expect, vi, beforeEach } from "vitest";

interface FakeUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

const userStore = new Map<string, FakeUser>();
let nextId = 1;

vi.mock("../db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return userStore.get(where.email) ?? null;
        if (where.id) return [...userStore.values()].find((u) => u.id === where.id) ?? null;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<FakeUser, "id"> }) => {
        const user: FakeUser = { id: `user_${nextId++}`, ...data };
        userStore.set(user.email, user);
        return user;
      }),
    },
  },
}));

const { register, login, getUserById, toPublicUser } = await import("./auth.service.js");
const { AppError } = await import("../utils/errors.js");
const { verifyToken } = await import("./jwt.js");

beforeEach(() => {
  userStore.clear();
  nextId = 1;
});

describe("auth.service", () => {
  it("registers a new user, hashes the password, and returns a valid JWT", async () => {
    const result = await register("Jane Doe", "jane@example.com", "supersecret");
    expect(result.user).toEqual({ id: expect.any(String), name: "Jane Doe", email: "jane@example.com" });
    expect(userStore.get("jane@example.com")?.passwordHash).not.toBe("supersecret");

    const payload = verifyToken(result.token);
    expect(payload.email).toBe("jane@example.com");
    expect(payload.sub).toBe(result.user.id);
  });

  it("rejects registration with a duplicate email", async () => {
    await register("Jane Doe", "jane@example.com", "supersecret");
    await expect(register("Jane Two", "jane@example.com", "anotherpass")).rejects.toBeInstanceOf(AppError);
  });

  it("logs in with correct credentials", async () => {
    await register("Jane Doe", "jane@example.com", "supersecret");
    const result = await login("jane@example.com", "supersecret");
    expect(result.user.email).toBe("jane@example.com");
    expect(verifyToken(result.token).email).toBe("jane@example.com");
  });

  it("rejects login with a wrong password", async () => {
    await register("Jane Doe", "jane@example.com", "supersecret");
    await expect(login("jane@example.com", "wrongpassword")).rejects.toBeInstanceOf(AppError);
  });

  it("rejects login for an unknown email without revealing which part was wrong", async () => {
    await expect(login("nobody@example.com", "whatever")).rejects.toThrow("Invalid email or password.");
  });

  it("getUserById returns the public user shape", async () => {
    const { user } = await register("Jane Doe", "jane@example.com", "supersecret");
    const found = await getUserById(user.id);
    expect(found).toEqual(user);
  });

  it("getUserById throws for an unknown id", async () => {
    await expect(getUserById("does-not-exist")).rejects.toBeInstanceOf(AppError);
  });

  it("toPublicUser strips the password hash", () => {
    const pub = toPublicUser({ id: "1", name: "A", email: "a@b.com", passwordHash: "xxx" } as FakeUser);
    expect(pub).toEqual({ id: "1", name: "A", email: "a@b.com" });
  });
});
