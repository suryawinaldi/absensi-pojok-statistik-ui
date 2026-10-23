import test from "node:test";
import assert from "node:assert/strict";
import { createLoginHandler, getLoginConfig } from "../server/admin-login.js";
import { loginWithUsername } from "../admin/src/auth.js";
const USER = "11111111-1111-4111-8111-111111111111";
const settings = {
  url: "https://example.supabase.co",
  key: "public-test-key",
  username: "adminpojokui",
  email: "owner@example.test",
};
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
function request(
  body = { username: "adminpojokui", password: "fixture-password" },
  method = "POST",
) {
  return {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.1",
    },
    body,
  };
}
function result() {
  return {
    headers: {},
    statusCode: 0,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
function setup({ responses, config = () => settings, now } = {}) {
  const calls = [];
  const queue = responses || [
    response({
      access_token: "access",
      refresh_token: "refresh",
      user: { id: USER },
    }),
    response([{ user_id: USER }]),
  ];
  const handler = createLoginHandler({
    config,
    now,
    fetcher: async (url, init) => {
      calls.push({ url, init });
      const next = queue.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, "Unexpected upstream request");
      return next;
    },
  });
  return { handler, calls };
}
test("username is resolved only on the server; password and email are not returned", async () => {
  const { handler, calls } = setup(),
    res = result();
  await handler(
    request({ username: " AdminPojokUI ", password: "fixture-password" }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    access_token: "access",
    refresh_token: "refresh",
  });
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    email: "owner@example.test",
    password: "fixture-password",
  });
  assert.match(calls[1].url, /ps_admin/);
  assert.equal(calls[1].init.headers.Authorization, "Bearer access");
  assert.equal(res.headers["Cache-Control"], "no-store");
});
test("wrong username and wrong password produce the same public error", async () => {
  const first = setup(),
    a = result();
  await first.handler(request({ username: "unknown", password: "wrong" }), a);
  assert.equal(first.calls.length, 0);
  const second = setup({
      responses: [response({ error: "upstream private details" }, 400)],
    }),
    b = result();
  await second.handler(request(), b);
  assert.equal(a.statusCode, 401);
  assert.equal(b.statusCode, 401);
  assert.deepEqual(a.body, b.body);
});
test("a valid Supabase account without admin membership never receives tokens", async () => {
  const { handler } = setup({
      responses: [
        response({
          access_token: "access",
          refresh_token: "refresh",
          user: { id: USER },
        }),
        response([]),
      ],
    }),
    res = result();
  await handler(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.access_token, undefined);
});
test("missing database and transport failure do not create a frontend session", async () => {
  for (const responses of [
    [
      response({
        access_token: "access",
        refresh_token: "refresh",
        user: { id: USER },
      }),
      response({}, 404),
    ],
    [new Error("private server details")],
  ]) {
    const { handler } = setup({ responses }),
      res = result();
    await handler(request(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.access_token, undefined);
    assert.ok(!JSON.stringify(res.body).includes("private"));
  }
});
test("login throttles repeated requests on the same instance and recovers after a minute", async () => {
  let time = 0;
  const { handler } = setup({ now: () => time });
  for (let i = 0; i < 5; i++) {
    const res = result();
    await handler(request({ username: "wrong", password: "wrong" }), res);
    assert.equal(res.statusCode, 401);
  }
  const limited = result();
  await handler(request({ username: "wrong", password: "wrong" }), limited);
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers["Retry-After"], "60");
  time = 60001;
  const reset = result();
  await handler(request({ username: "wrong", password: "wrong" }), reset);
  assert.equal(reset.statusCode, 401);
});
test("unconfigured login, invalid methods and malformed bodies return controlled errors", async () => {
  const unavailable = setup({
      config: () => {
        throw Error("private config");
      },
    }),
    a = result();
  await unavailable.handler(request(), a);
  assert.equal(a.statusCode, 503);
  assert.ok(!JSON.stringify(a.body).includes("private"));
  const { handler } = setup(),
    b = result();
  await handler(request({}, "GET"), b);
  assert.equal(b.statusCode, 405);
  const c = result();
  await handler(request("not-json"), c);
  assert.equal(c.statusCode, 400);
  const d = result();
  await handler({ ...request(), headers: { "content-type": "text/plain" } }, d);
  assert.equal(d.statusCode, 415);
});
test("server configuration accepts a normalized username and rejects secret keys", () => {
  const config = getLoginConfig({
    ADMIN_USERNAME: "AdminPojokUI",
    ADMIN_EMAIL: "owner@example.test",
  });
  assert.equal(config.username, "adminpojokui");
  assert.equal(config.email, "owner@example.test");
  assert.throws(() =>
    getLoginConfig({ ADMIN_USERNAME: "ok", ADMIN_EMAIL: "owner@example.test" }),
  );
  assert.throws(() =>
    getLoginConfig({
      ADMIN_USERNAME: "adminpojokui",
      ADMIN_EMAIL: "owner@example.test",
      PUBLIC_SUPABASE_ANON_KEY: "sb_secret_not_allowed",
    }),
  );
});
test("browser posts username to the server and persists only the returned session", async () => {
  let submitted, session;
  const client = {
    auth: {
      setSession: async (value) => {
        session = value;
        return { error: null };
      },
    },
  };
  await loginWithUsername(
    client,
    " adminpojokui ",
    "password",
    async (url, init) => {
      assert.equal(url, "/api/admin-login");
      submitted = JSON.parse(init.body);
      return response({ access_token: "access", refresh_token: "refresh" });
    },
  );
  assert.deepEqual(submitted, {
    username: "adminpojokui",
    password: "password",
  });
  assert.deepEqual(session, {
    access_token: "access",
    refresh_token: "refresh",
  });
});
test("browser does not store a session after login errors", async () => {
  const client = {
    auth: {
      setSession: async () => {
        assert.fail("Unexpected session creation");
      },
    },
  };
  await assert.rejects(
    loginWithUsername(client, "adminpojokui", "wrong", async () =>
      response({ error: "Username atau password tidak sesuai." }, 401),
    ),
    /Username atau password/,
  );
  await assert.rejects(
    loginWithUsername(client, "adminpojokui", "wrong", async () => {
      throw Error("offline");
    }),
    /koneksi/,
  );
});
