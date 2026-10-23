import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const USERNAME = /^[a-z0-9_.-]{3,32}$/;
const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const equal = (left, right) =>
  timingSafeEqual(
    createHash("sha256").update(left).digest(),
    createHash("sha256").update(right).digest(),
  );

export function getLoginConfig(env = process.env) {
  // This existing file contains public configuration only, never the admin password.
  const source = readFileSync(
    new URL("../js/supabase.js", import.meta.url),
    "utf8",
  );
  const url =
    env.PUBLIC_SUPABASE_URL ||
    source.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
  const key =
    env.PUBLIC_SUPABASE_ANON_KEY ||
    source.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)?.[1];
  const username = normalize(env.ADMIN_USERNAME);
  const email = env.ADMIN_EMAIL?.trim();
  if (
    !url ||
    new URL(url).protocol !== "https:" ||
    !key ||
    !USERNAME.test(username) ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw Error("Login configuration is incomplete");
  if (key.startsWith("sb_secret_"))
    throw Error("A secret key must not be used");
  if (key.split(".").length === 3) {
    if (
      JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
        .role !== "anon"
    )
      throw Error("Only an anon key may be used");
  } else if (!key.startsWith("sb_publishable_"))
    throw Error("Invalid public key");
  return { url: new URL(url).origin, key, username, email };
}

export function createLoginHandler({
  fetcher = fetch,
  config = getLoginConfig,
  now = Date.now,
} = {}) {
  // Best-effort per-instance throttle; GoTrue limits still apply. For a
  // distributed deployment configure a Vercel Firewall rate limit as documented.
  const attempts = new Map();
  const windowMs = 60_000;
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const respond = (status, data) => res.status(status).json(data);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return respond(405, { error: "Metode tidak diizinkan." });
    }
    if (
      !String(req.headers["content-type"] || "")
        .toLowerCase()
        .startsWith("application/json")
    )
      return respond(415, { error: "Format permintaan tidak didukung." });
    let settings;
    try {
      settings = config();
    } catch {
      return respond(503, {
        error:
          "Login admin belum dikonfigurasi. Lengkapi pengaturan server Vercel.",
      });
    }
    let body = req.body;
    try {
      if (typeof body === "string") body = JSON.parse(body);
    } catch {
      return respond(400, { error: "Permintaan login tidak valid." });
    }
    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      body.username.length > 128 ||
      !body.password.length ||
      body.password.length > 1024
    )
      return respond(400, { error: "Isi username dan password yang valid." });
    const ip = String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    )
      .split(",")[0]
      .trim()
      .slice(0, 128);
    const time = now();
    let attempt = attempts.get(ip);
    if (!attempt || attempt.until <= time)
      attempt = { count: 0, until: time + windowMs };
    if (attempt.count >= 5) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((attempt.until - time) / 1000))),
      );
      return respond(429, {
        error: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.",
      });
    }
    if (attempts.size >= 5000)
      for (const [key, value] of attempts)
        if (value.until <= time) attempts.delete(key);
    if (attempts.size >= 5000 && !attempts.has(ip))
      attempts.delete(attempts.keys().next().value);
    attempt.count++;
    attempts.set(ip, attempt);
    if (!equal(normalize(body.username), settings.username))
      return respond(401, { error: "Username atau password tidak sesuai." });
    try {
      const authResponse = await fetcher(
        `${settings.url}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: settings.key },
          body: JSON.stringify({
            email: settings.email,
            password: body.password,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!authResponse.ok) {
        if (authResponse.status === 429)
          return respond(429, {
            error:
              "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.",
          });
        if (authResponse.status >= 500)
          return respond(503, {
            error: "Layanan login belum dapat dihubungi. Coba lagi.",
          });
        return respond(401, { error: "Username atau password tidak sesuai." });
      }
      const session = await authResponse.json();
      if (
        !session.access_token ||
        !session.refresh_token ||
        !/^[0-9a-f-]{36}$/i.test(session.user?.id || "")
      )
        return respond(502, {
          error: "Respons login belum dapat diverifikasi.",
        });
      const adminResponse = await fetcher(
        `${settings.url}/rest/v1/ps_admin?select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
        {
          headers: {
            apikey: settings.key,
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!adminResponse.ok)
        return respond(503, {
          error:
            "Akun atau database workspace belum diaktifkan. Periksa migrasi Supabase.",
        });
      const admins = await adminResponse.json();
      if (
        !Array.isArray(admins) ||
        !admins.some((admin) => admin.user_id === session.user.id)
      )
        return respond(403, {
          error: "Akun ini belum terdaftar sebagai admin workspace.",
        });
      attempts.delete(ip);
      // Password and mapping email are never returned. Tokens belong only to
      // the authenticated, registered admin and are stored by Supabase Auth.
      return respond(200, {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch {
      return respond(503, {
        error:
          "Layanan login belum dapat dihubungi. Periksa koneksi lalu coba lagi.",
      });
    }
  };
}
