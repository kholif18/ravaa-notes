import crypto from "crypto";
import bcrypt from "bcryptjs";
export const generateShareToken = () => crypto.randomBytes(32).toString("base64url");
export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);
