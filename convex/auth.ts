import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password_hash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      email: normalizedEmail,
      password_hash: args.password_hash,
      name: args.name,
      role: args.role ?? "admin",
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    password_hash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      password_hash: args.password_hash,
      updated_at: Date.now(),
    });

    return await ctx.db.get(args.userId);
  },
});

export const touchUserLogin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.userId, {
      last_login_at: now,
      updated_at: now,
    });
  },
});

export const createOtpSession = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    otp_hash: v.string(),
    expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const existingForEmail = await ctx.db
      .query("auth_otp_sessions")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    await Promise.all(
      existingForEmail
        .filter((item) => !item.used && item.purpose === "login")
        .map((item) => ctx.db.patch(item._id, { used: true }))
    );

    return await ctx.db.insert("auth_otp_sessions", {
      user_id: args.userId,
      email: normalizedEmail,
      otp_hash: args.otp_hash,
      expires_at: args.expires_at,
      attempts: 0,
      max_attempts: 5,
      used: false,
      purpose: "login",
      created_at: Date.now(),
    });
  },
});

export const getOtpSessionById = query({
  args: {
    sessionId: v.id("auth_otp_sessions"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    if (session.email !== args.email.toLowerCase().trim()) {
      return null;
    }

    const user = await ctx.db.get(session.user_id);
    return {
      session,
      user,
    };
  },
});

export const registerOtpAttempt = mutation({
  args: { sessionId: v.id("auth_otp_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { locked: true, attempts: 0, maxAttempts: 0 };
    }

    const nextAttempts = session.attempts + 1;
    const locked = nextAttempts >= session.max_attempts;

    await ctx.db.patch(args.sessionId, {
      attempts: nextAttempts,
      used: locked ? true : session.used,
    });

    return {
      locked,
      attempts: nextAttempts,
      maxAttempts: session.max_attempts,
    };
  },
});

export const consumeOtpSession = mutation({
  args: { sessionId: v.id("auth_otp_sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { used: true });
  },
});

export const createAuthSession = mutation({
  args: {
    userId: v.id("users"),
    session_hash: v.string(),
    expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auth_sessions", {
      user_id: args.userId,
      session_hash: args.session_hash,
      expires_at: args.expires_at,
      revoked: false,
      created_at: Date.now(),
    });
  },
});

export const getAuthSessionByHash = query({
  args: { session_hash: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_session_hash", (q) => q.eq("session_hash", args.session_hash))
      .first();

    if (!session || session.revoked || session.expires_at < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.user_id);
    if (!user || user.is_active === false) {
      return null;
    }

    return {
      session,
      user,
    };
  },
});

export const revokeAuthSession = mutation({
  args: { session_hash: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_session_hash", (q) => q.eq("session_hash", args.session_hash))
      .first();

    if (!session) {
      return false;
    }

    await ctx.db.patch(session._id, { revoked: true });
    return true;
  },
});

export const revokeAllUserSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    await Promise.all(
      sessions
        .filter((session) => !session.revoked)
        .map((session) => ctx.db.patch(session._id, { revoked: true }))
    );
  },
});

export const createPasswordResetToken = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    token_hash: v.string(),
    expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    await Promise.all(
      existing
        .filter((token) => !token.used)
        .map((token) => ctx.db.patch(token._id, { used: true }))
    );

    return await ctx.db.insert("password_reset_tokens", {
      user_id: args.userId,
      email: normalizedEmail,
      token_hash: args.token_hash,
      expires_at: args.expires_at,
      used: false,
      created_at: Date.now(),
    });
  },
});

export const getPasswordResetByHash = query({
  args: { token_hash: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token_hash", (q) => q.eq("token_hash", args.token_hash))
      .first();

    if (!token || token.used || token.expires_at < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(token.user_id);
    if (!user || user.is_active === false) {
      return null;
    }

    return {
      token,
      user,
    };
  },
});

export const consumePasswordResetToken = mutation({
  args: { tokenId: v.id("password_reset_tokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, { used: true });
  },
});
