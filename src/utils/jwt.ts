import { sign, verify } from "jsonwebtoken";

export const generateToken = (id: string, name: string, email: string) => {
  return sign({ id, name, email }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string) => {
  try {
    const decoded = verify(token, process.env.JWT_SECRET as string);
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};