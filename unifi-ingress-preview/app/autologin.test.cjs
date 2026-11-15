const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createAutoLogin } = require("./autologin.cjs");

test("auto-login scopes cookies and pauses after rejected credentials", async () => {
    const requests = [];
    let reply = { statusCode: 200, headers: {
        "set-cookie": ["TOKEN=secret; Path=/; HttpOnly; Secure"],
        "x-csrf-token": "csrf-value",
    }};
    const request = (options, callback) => {
        const upstream = new EventEmitter();
        requests.push(options);
        upstream.setTimeout = () => {};
        upstream.end = body => {
            options.body = body;
            queueMicrotask(() => callback({ ...reply, resume() {} }));
        };
        return upstream;
    };
    const login = createAutoLogin({
        target: new URL("https://192.0.2.19"), agent: { pinned: true },
        username: "local-admin", password: "test-password", request,
    });
    const send = () => new Promise(resolve => {
        const res = {
            writeHead(status, headers = {}) { this.status = status; this.headers = headers; },
            end() { resolve(this); },
        };
        login(res, "/api/hassio_ingress/Unifi_Test123");
    });
    const success = await send();
    assert.equal(success.status, 204);
    assert.equal(requests[0].path, "/api/auth/login");
    assert.equal(requests[0].hostname, "192.0.2.19");
    assert.equal(requests[0].agent.pinned, true);
    assert.deepEqual(JSON.parse(requests[0].body), {
        username: "local-admin", password: "test-password", remember: true,
    });
    assert.ok(success.headers["set-cookie"].some(x => x.startsWith("unifi_ingress_TOKEN=secret; Path=/api/hassio_ingress/Unifi_Test123/")));
    assert.ok(success.headers["set-cookie"].some(x => x.startsWith("__unifi_bridge_csrf=csrf-value; Path=/api/hassio_ingress/Unifi_Test123/")));
    assert.equal(success.headers["cache-control"], "no-store");
    reply = { statusCode: 401, headers: {} };
    assert.equal((await send()).status, 401);
    assert.equal((await send()).status, 429);
    assert.equal(requests.length, 2);
});

test("auto-login is disabled when credentials are empty", async () => {
    const login = createAutoLogin({
        target: new URL("https://192.0.2.19"), agent: {},
        username: "", password: "", request() { throw new Error("unexpected request"); },
    });
    let status;
    login({ writeHead(value) { status = value; }, end() {} }, "/api/hassio_ingress/test");
    assert.equal(status, 404);
});
