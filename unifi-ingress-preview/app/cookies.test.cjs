const test = require("node:test");
const assert = require("node:assert/strict");
const { requestCookies, responseCookie } = require("./cookies.cjs");
test("Home Assistant and unrelated cookies never reach UniFi", () => {
    assert.equal(requestCookies("hassio_ingress_session=private; other=value; unifi_ingress_TOKEN=abc; unifi_ingress_csrf=def"), "TOKEN=abc; csrf=def");
    assert.equal(requestCookies(), "");
});
test("UniFi cookies are named separately and scoped to the Ingress session", () => {
    assert.equal(responseCookie("TOKEN=abc; Path=/; Domain=router.local; Secure; HttpOnly", "/api/hassio_ingress/Test"), "unifi_ingress_TOKEN=abc; Path=/api/hassio_ingress/Test/; Secure; HttpOnly");
    assert.equal(responseCookie("csrf=def", "/api/hassio_ingress/Test"), "unifi_ingress_csrf=def; Path=/api/hassio_ingress/Test/");
});
