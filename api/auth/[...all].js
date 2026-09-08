import { toNodeHandler } from "better-auth/node";
import { auth } from "../../src/server/auth/auth.js";

export default toNodeHandler(auth);
