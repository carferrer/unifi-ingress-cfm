(() => {
    "use strict";
    const prefix = document.querySelector('meta[name="unifi-ingress-path"]').content;
    if (!/^\/api\/hassio_ingress\/[A-Za-z0-9_-]+$/.test(prefix)) throw new Error("Invalid Ingress prefix");
    const actual = window.location;
    const strip = pathname => pathname === prefix ? "/" : pathname.startsWith(prefix + "/") ? pathname.slice(prefix.length) : pathname;
    const initial = new URL(actual.href);
    const redirect = initial.searchParams.get("redirect");
    if (redirect && (redirect === prefix || redirect.startsWith(prefix + "/"))) {
        initial.searchParams.set("redirect", strip(redirect));
        history.replaceState(history.state, "", initial.href);
    }
    const cookiePrefix = "unifi_ingress_";
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (cookieDescriptor?.get && cookieDescriptor?.set) Object.defineProperty(document, "cookie", {
        get() { return cookieDescriptor.get.call(document).split(";").map(x => x.trim()).filter(x => x.startsWith(cookiePrefix)).map(x => x.slice(cookiePrefix.length)).join("; "); },
        set(value) {
            let scoped = cookiePrefix + String(value).replace(/;\s*Domain=[^;]*/ig, "").replace(/;\s*Path=([^;]*)/ig, (_, p) => "; Path=" + prefix + (p.startsWith("/") ? p : "/"));
            if (!/;\s*Path=/i.test(scoped)) scoped += "; Path=" + prefix + "/";
            cookieDescriptor.set.call(document, scoped);
        }
    });
    const adapt = value => {
        if (typeof value !== "string" && !(value instanceof URL)) return value;
        const url = new URL(String(value), actual.origin + strip(actual.pathname) + actual.search);
        if (url.origin !== actual.origin || /^(?:data:|blob:|javascript:|mailto:|#)/i.test(String(value))) return value;
        if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) url.pathname = prefix + url.pathname;
        return url.href;
    };
    const virtual = {};
    for (const key of ["href", "pathname", "origin", "protocol", "host", "hostname", "port", "search", "hash"]) {
        Object.defineProperty(virtual, key, { get() {
            if (key === "pathname") return strip(actual.pathname);
            if (key === "href") return actual.origin + strip(actual.pathname) + actual.search + actual.hash;
            return actual[key];
        }, set(value) {
            if (key === "href") actual.href = adapt(value);
            else if (key === "pathname") actual.href = adapt(value) + actual.search + actual.hash;
            else actual[key] = value;
        }});
    }
    virtual.assign = value => actual.assign(adapt(value));
    virtual.replace = value => actual.replace(adapt(value));
    virtual.reload = () => actual.reload();
    virtual.toString = () => virtual.href;
    const reportTaskError = error => {
        const kind = ["TypeError", "ReferenceError", "SyntaxError", "RangeError"].includes(error?.name) ? error.name : "Error";
        // Do not output the error object: HTTP errors can contain request headers,
        // credentials and bodies. Standard JS errors plus sanitized stack only.
        const sanitize = value => String(value || "").replace(/https?:\/\/[^\s)]+/g, "[URL]")
            .replace(/\/api\/hassio_ingress\/[^/\s]+/g, "/api/hassio_ingress/[session]")
            .replace(/(?:password|authorization|token|cookie|secret)\s*[:=]\s*\S+/ig, "[redacted]").slice(0,1600);
        const message = kind === "Error" ? "Background task aborted" : sanitize(error?.message);
        const stack = typeof error?.stack === "string" ? sanitize(error.stack.split("\n").slice(1,7).join("\n")) : "";
        console.error("[UniFi Ingress] Network background task failed:", kind, message, stack);
    };
    const bridge = { adapt, reportTaskError };
    Object.defineProperty(bridge, "location", { get: () => virtual, set: value => virtual.assign(value) });
    window.__unifiIngress = bridge;
    for (const method of ["pushState", "replaceState"]) {
        const original = history[method].bind(history);
        history[method] = (state, unused, url) => original(state, unused, url == null ? url : adapt(url));
    }
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        if (input instanceof Request) {
            const body = input.body && !(init && "body" in init) ? await input.clone().arrayBuffer() : undefined;
            return fetchOriginal(new Request(adapt(input.url), input), { ...(body === undefined ? {} : { body }), ...init });
        }
        return fetchOriginal(adapt(input), init);
    };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) { return open.call(this, method, adapt(url), ...rest); };
    const socket = window.WebSocket;
    window.WebSocket = class extends socket {
        constructor(url, protocols) {
            const parsed = new URL(url, actual.href);
            if (parsed.host === actual.host && !parsed.pathname.startsWith(prefix + "/")) parsed.pathname = prefix + parsed.pathname;
            super(parsed.href, ...(protocols === undefined ? [] : [protocols]));
        }
    };
    const source = window.EventSource;
    if (source) window.EventSource = class extends source { constructor(url, options) { super(adapt(url), options); } };
    const windowOpen = window.open.bind(window);
    window.open = (url, ...args) => windowOpen(url == null ? url : adapt(url), ...args);
    const adaptSrcset = value => String(value).replace(/(^|,\s*)(\/(?!\/)[^\s,]+|https?:\/\/[^\s,]+)(?=\s|,|$)/g,
        (_, separator, url) => separator + adapt(url));
    const adaptCSS = value => typeof value === "string" ? value.replace(/url\(\s*(['"]?)(\/(?!\/)[^\s)'"\\]+|https?:\/\/[^\s)'"\\]+)\1\s*\)/gi,
        (_, quote, url) => 'url("' + adapt(url) + '")') : value;
    const setAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        const key = name.toLowerCase();
        const mapped = ["src", "href", "action", "poster"].includes(key) ? adapt(value)
            : ["srcset", "imagesrcset"].includes(key) ? adaptSrcset(value) : key === "style" ? adaptCSS(value) : value;
        return setAttribute.call(this, name, mapped);
    };
    for (const [type, property] of [[HTMLScriptElement,"src"], [HTMLLinkElement,"href"], [HTMLImageElement,"src"], [HTMLIFrameElement,"src"], [HTMLAnchorElement,"href"], [HTMLFormElement,"action"], [HTMLSourceElement,"src"]]) {
        const descriptor = Object.getOwnPropertyDescriptor(type.prototype, property);
        if (descriptor?.set) Object.defineProperty(type.prototype, property, { ...descriptor, set(value) { descriptor.set.call(this, adapt(value)); } });
    }
    for (const [type, property] of [[HTMLImageElement,"srcset"], [HTMLSourceElement,"srcset"], [HTMLLinkElement,"imageSrcset"]]) {
        const descriptor = Object.getOwnPropertyDescriptor(type.prototype, property);
        if (descriptor?.set) Object.defineProperty(type.prototype, property, { ...descriptor, set(value) { descriptor.set.call(this, adaptSrcset(value)); } });
    }
    const styleSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function(name, value, priority) { return styleSetProperty.call(this, name, adaptCSS(value), priority); };
    for (const property of ["background", "backgroundImage", "mask", "maskImage", "listStyleImage", "borderImage", "borderImageSource", "content", "cssText"]) {
        const descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, property);
        if (descriptor?.set) Object.defineProperty(CSSStyleDeclaration.prototype, property, { ...descriptor, set(value) { descriptor.set.call(this, adaptCSS(value)); } });
    }
    const insertRule = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function(rule, ...args) { return insertRule.call(this, adaptCSS(rule), ...args); };
    for (const method of ["replace", "replaceSync"]) {
        const original = CSSStyleSheet.prototype[method];
        if (original) CSSStyleSheet.prototype[method] = function(value) { return original.call(this, adaptCSS(value)); };
    }
    const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
    Object.defineProperty(Node.prototype, "textContent", { ...textDescriptor, set(value) {
        textDescriptor.set.call(this, this.nodeName === "STYLE" ? adaptCSS(value) : value);
    }});
    document.addEventListener("click", event => {
        const anchor = event.target.closest?.("a[href]");
        if (anchor) { const href = anchor.getAttribute("href"); if (href && !href.startsWith("#")) setAttribute.call(anchor, "href", adapt(href)); }
    }, true);
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error("Service workers are disabled in Ingress"));
})();

