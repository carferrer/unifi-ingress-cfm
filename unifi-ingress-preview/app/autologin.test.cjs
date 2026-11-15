const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once, EventEmitter } = require("node:events");
const http = require("node:http");
const https = require("node:https");

test("auto-login uses the pinned upstream and scopes cookies without exposing credentials", async () => {
    const originalRequest = https.request;
    const originalEnv = { ...process.env };
    const requests = [];
    let reply = { statusCode: 200, headers: {
        "set-cookie": ["TOKEN=secret; Path=/; HttpOnly; Secure"],
        "x-csrf-token": "csrf-value",
    }};
    https.request = (options, callback) => {
        requests.push(options);
        const upstream = new EventEmitter();
        upstream.setTimeout = () => {};
        upstream.end = body => {
            requests.at(-1).body = body;
            queueMicrotask(() => callback({ ...reply, resume() {} }));
        };
        return upstream;
    };
    Object.assign(process.env, {
        DEV_HARNESS: "1", PORT: "0", UNIFI_URL: "https://192.0.2.19",
        UNIFI_PIN: "A".repeat(64), UNIFI_USERNAME: "local-admin", UNIFI_PASSWORD: "test-password",
    });
    const server = require("./proxy.cjs");
    try {
        if (!server.listening) await once(server, "listening");
        const port = server.address().port;
        const send = () => new Promise((resolve, reject) => {
            const req = http.request({
                hostname: "127.0.0.1", port, method: "POST",
                path: "/api/hassio_ingress/Unifi_Test123/__unifi_autologin",
            }, res => {
                res.resume();
                res.on("end", () => resolve(res));
            });
            req.on("error", reject); req.end();
        });
        const success = await send();
        assert.equal(success.statusCode, 204);
        assert.equal(requests[0].path, "/api/auth/login");
        assert.equal(requests[0].hostname, "192.0.2.19");
        assert.equal(typeof requests[0].agent.createConnection, "function");
        assert.deepEqual(JSON.parse(requests[0].body), {
            username: "local-admin", password: "test-password", remember: true,
        });
        assert.ok(success.headers["set-cookie"].some(x => x.startsWith("unifi_ingress_TOKEN=secret; Path=/api/hassio_ingress/Unifi_Test123/")));
        assert.ok(success.headers["set-cookie"].some(x => x.startsWith("__unifi_bridge_csrf=csrf-value; Path=/api/hassio_ingress/Unifi_Test123/")));
        assert.equal(success.headers["cache-control"], "no-store");
        reply = { statusCode: 401, headers: {} };
        const rejected = await send();
        assert.equal(rejected.statusCode, 401);
        const blocked = await send();
        assert.equal(blocked.statusCode, 429);
        assert.equal(requests.length, 2);
    } finally {
        await new Promise(resolve => server.close(resolve));
        https.request = originalRequest;
        for (const key of ["DEV_HARNESS", "PORT", "UNIFI_URL", "UNIFI_PIN", "UNIFI_USERNAME", "UNIFI_PASSWORD"]) {
            if (originalEnv[key] === undefined) delete process.env[key];
            else process.env[key] = originalEnv[key];
        }
    }
});
