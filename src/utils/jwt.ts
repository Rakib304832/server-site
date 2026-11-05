import jwt from "jsonwebtoken";

export const generateToken = (id: string, name: string, email: string) => {
  return jwt.sign({ id, name, email }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    return decoded;
  } catch {
    throw new Error("Invalid or expired token");
  }
};