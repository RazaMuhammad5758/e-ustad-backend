// server/src/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// parse cookie string into object
function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("=") || "");
  });
  return out;
}

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  // ✅ socket auth using JWT from cookies
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies?.token;

      if (!token) return next(new Error("Not authenticated"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // save userId on socket
      socket.userId = payload.sub;
      return next();
    } catch (e) {
      return next(new Error("Invalid/expired token"));
    }
  });

  io.on("connection", (socket) => {
    // ✅ join personal room
    const room = String(socket.userId);
    socket.join(room);

    // optional logs
    // console.log("socket connected:", room);
    socket.on("disconnect", () => {
      // console.log("socket disconnected:", room);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// helper emit
export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(String(userId)).emit(event, payload);
}
