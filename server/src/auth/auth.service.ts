import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { AppError } from "../utils/errors.js";
import { signToken } from "./jwt.js";

const SALT_ROUNDS = 10;

export function toPublicUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

export async function register(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("An account with that email already exists.", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toPublicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toPublicUser(user) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
  return toPublicUser(user);
}
