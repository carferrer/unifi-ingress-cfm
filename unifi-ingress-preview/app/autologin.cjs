const { responseCookie } = require("./cookies.cjs");

function createAutoLogin({ target, agent, username, password, request }) {
    let blockedUntil = 0;
    return (res, prefix) => {
        if (!username || !password) { res.writeHead(404); res.end(); return; }
        if (Date.now() < blockedUntil) { res.writeHead(429); res.end("Login temporarily paused"); return; }
        const body = JSON.stringify({ username, password, remember: true });
        const upstream = request({
            hostname: target.hostname, port: target.port || 443, path: "/api/auth/login",
            method: "POST", agent, headers: {
                host: target.host, origin: target.origin, referer: target.origin + "/login",
                "content-type": "application/json", "content-length": Buffer.byteLength(body),
            },
        }, response => {
            const cookies = response.headers["set-cookie"] || [];
            if (![200, 204].includes(response.statusCode) || !cookies.length) {
                blockedUntil = Date.now() + 120000;
                res.writeHead(response.statusCode === 429 ? 429 : 401);
                response.resume(); res.end("UniFi login was rejected"); return;
            }
            const scoped = cookies.map(cookie => responseCookie(cookie, prefix));
            const csrf = response.headers["x-csrf-token"];
            if (typeof csrf === "string" && csrf) {
                scoped.push("__unifi_bridge_csrf=" + encodeURIComponent(csrf) +
                    "; Path=" + prefix + "/; HttpOnly; Secure; SameSite=Strict");
            }
            response.resume();
            res.writeHead(204, { "set-cookie": scoped, "cache-control": "no-store" });
            res.end();
        });
        upstream.on("error", () => { blockedUntil = Date.now() + 120000; res.writeHead(502); res.end("UniFi login unavailable"); });
        upstream.setTimeout(15000, () => upstream.destroy(new Error("Login timeout")));
        upstream.end(body);
    };
}
module.exports = { createAutoLogin };
