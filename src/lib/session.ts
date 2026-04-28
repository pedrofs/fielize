import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const SESSION_COOKIE = "fielize_session";
const NINETY_DAYS_S = 60 * 60 * 24 * 90;
const MAGIC_LINK_S = 60 * 30;

export type ConsumerSession = {
  userId: string;
  iat: number;
  exp: number;
};

export type MagicLinkPayload = {
  userId: string;
  associationId: string;
  storeId?: string;
  iat: number;
  exp: number;
};

export async function signConsumerSession(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + NINETY_DAYS_S)
    .sign(SECRET);
}

export async function verifyConsumerSession(jwt: string): Promise<ConsumerSession | null> {
  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    return payload as unknown as ConsumerSession;
  } catch {
    return null;
  }
}

export async function signMagicLink(args: {
  userId: string;
  associationId: string;
  storeId?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    userId: args.userId,
    associationId: args.associationId,
    storeId: args.storeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + MAGIC_LINK_S)
    .sign(SECRET);
}

export async function verifyMagicLink(jwt: string): Promise<MagicLinkPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    return payload as unknown as MagicLinkPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = NINETY_DAYS_S;
