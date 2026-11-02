const COOKIE_PREFIX = "unifi_ingress_";
function requestCookies(value = "") {
    return value.split(";").map(item => item.trim()).filter(item => item.startsWith(COOKIE_PREFIX) && item.includes("="))
        .map(item => item.slice(COOKIE_PREFIX.length)).join("; ");
}
function responseCookie(cookie, prefix) {
    let rewritten = COOKIE_PREFIX + cookie.replace(/;\s*Domain=[^;]*/ig, "")
        .replace(/;\s*Path=([^;]*)/ig, (_, value) => "; Path=" + prefix + (value.startsWith("/") ? value : "/"));
    if (!/;\s*Path=/i.test(rewritten)) rewritten += "; Path=" + prefix + "/";
    return rewritten;
}
module.exports = { requestCookies, responseCookie };
