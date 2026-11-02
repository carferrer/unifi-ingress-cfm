const http = require("node:http");
const https = require("node:https");
const tls = require("node:tls");
const fs = require("node:fs");
const path = require("node:path");
const { transformScript } = require("./transform.cjs");
const { requestCookies, responseCookie } = require("./cookies.cjs");
const target = new URL(process.env.UNIFI_URL);
const pin = (process.env.UNIFI_PIN || "").trim().replaceAll(":", "").toUpperCase();
if (target.protocol !== "https:" || target.username || target.password || !/^[A-F0-9]{64}$/.test(pin)) throw new Error("Invalid target or certificate fingerprint");
const dev = process.env.DEV_HARNESS === "1";
const fixedPrefix = "/api/hassio_ingress/Unifi_Test123";
const shim = fs.readFileSync(path.join(__dirname, "shim.js"), "utf8");
const agent = new https.Agent({ keepAlive: true });
agent.createConnection = (options, callback) => {
    const connection = tls.connect({ ...options, rejectUnauthorized: false }, () => {
        const received = connection.getPeerCertificate().fingerprint256?.replaceAll(":", "").toUpperCase();
        if (received !== pin) { connection.destroy(); callback(new Error("UniFi certificate fingerprint mismatch")); }
        else callback(null, connection);
    });
    connection.once("error", callback);
};
function info(req) {
    if (dev) {
        if (req.url !== fixedPrefix && !req.url.startsWith(fixedPrefix + "/")) return null;
        return { prefix: fixedPrefix, upstreamPath: req.url.slice(fixedPrefix.length) || "/" };
    }
    if (!["172.30.32.2", "::ffff:172.30.32.2"].includes(req.socket.remoteAddress)) return null;
    const prefix = req.headers["x-ingress-path"];
    if (typeof prefix !== "string" || !/^\/api\/hassio_ingress\/[A-Za-z0-9_-]+$/.test(prefix)) return null;
    return { prefix, upstreamPath: req.url };
}
function headersFor(req) {
    const headers = { ...req.headers, host: target.host, "accept-encoding": "identity" };
    for (const name of ["x-ingress-path", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "authorization", "if-none-match", "if-modified-since"]) delete headers[name];
    headers.cookie = requestCookies(headers.cookie);
    if (headers.origin) headers.origin = target.origin;
    if (headers.referer) {
        const referer = new URL(headers.referer);
        headers.referer = target.origin + referer.pathname.replace(/^\/api\/hassio_ingress\/[A-Za-z0-9_-]+/, "") + referer.search;
    }
    return headers;
}
const server = http.createServer((req, res) => {
    if (dev && req.url === "/harness") { res.setHeader("Content-Type", "text/html"); res.end(`<iframe style="width:100%;height:95vh;border:0" src="${fixedPrefix}/"></iframe>`); return; }
    const request = info(req);
    if (!request || !request.upstreamPath.startsWith("/") || request.upstreamPath.startsWith("//")) { res.writeHead(403); res.end("Forbidden"); return; }
    if (request.upstreamPath === "/__ingress_bridge.js") { res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-store" }); res.end(shim); return; }
    const upstream = https.request({ hostname: target.hostname, port: target.port || 443, path: request.upstreamPath, method: req.method, headers: headersFor(req), agent }, response => {
        const headers = { ...response.headers };
        for (const name of ["content-length", "transfer-encoding", "content-security-policy", "content-security-policy-report-only", "etag", "last-modified", "strict-transport-security"]) delete headers[name];
        headers["cache-control"] = "no-store";
        headers["x-frame-options"] = "SAMEORIGIN";
        if (headers.location) {
            const location = new URL(headers.location, target.origin + request.upstreamPath);
            if (location.origin === target.origin) headers.location = request.prefix + location.pathname + location.search + location.hash;
        }
        if (headers["set-cookie"]) headers["set-cookie"] = headers["set-cookie"].map(cookie => responseCookie(cookie, request.prefix));
        const type = headers["content-type"] || "";
        if (!/text\/html|javascript|text\/css/.test(type)) { res.writeHead(response.statusCode, headers); response.pipe(res); return; }
        const chunks = [];
        let size = 0;
        response.on("data", chunk => { size += chunk.length; if (size > 32 * 1024 * 1024) response.destroy(new Error("Response too large")); else chunks.push(chunk); });
        response.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end("Upstream response failed"); });
        response.on("end", () => {
            try {
                let body = Buffer.concat(chunks).toString("utf8");
                if (/javascript/.test(type)) body = transformScript(body, request.upstreamPath);
                else if (/text\/html/.test(type)) {
                    body = body.replace(/\b(src|href|action)=(['"])\/(?!\/)/g, (_, name, quote) => name + "=" + quote + request.prefix + "/");
                    body = body.replace(/<head([^>]*)>/i, `<head$1><base href="${request.prefix}/"><meta name="unifi-ingress-path" content="${request.prefix}"><script src="${request.prefix}/__ingress_bridge.js"></script>`);
                } else body = body.replace(/url\((['"]?)\/(?!\/)/g, (_, quote) => "url(" + quote + request.prefix + "/");
                res.writeHead(response.statusCode, headers); res.end(body);
            } catch (error) { console.error(error.message); res.writeHead(502); res.end("UniFi adaptation failed"); }
        });
    });
    upstream.on("error", error => { console.error(error.message); if (!res.headersSent) res.writeHead(502); res.end("UniFi is unreachable or its certificate has changed"); });
    upstream.setTimeout(30000, () => upstream.destroy(new Error("UniFi response timeout")));
    req.pipe(upstream);
});
server.on("upgrade", (req, socket, head) => {
    const request = info(req);
    if (!request || !request.upstreamPath.startsWith("/") || request.upstreamPath.startsWith("//")) { socket.destroy(); return; }
    const upstream = https.request({ hostname: target.hostname, port: target.port || 443, path: request.upstreamPath, headers: headersFor(req), agent });
    upstream.on("upgrade", (response, upstreamSocket, upstreamHead) => {
        socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([key,value])=>key+": "+value).join("\r\n")}\r\n\r\n`);
        if (head.length) upstreamSocket.write(head);
        if (upstreamHead.length) socket.write(upstreamHead);
        upstreamSocket.pipe(socket).pipe(upstreamSocket);
        socket.on("error", () => upstreamSocket.destroy()); upstreamSocket.on("error", () => socket.destroy());
    });
    upstream.on("response", () => socket.destroy()); upstream.on("error", () => socket.destroy()); upstream.end();
});
server.listen(Number(process.env.PORT || 18098), dev ? "127.0.0.1" : "0.0.0.0", () => console.log("UniFi Ingress bridge ready"));

