const acorn = require("acorn");
const walk = require("acorn-walk");
const MagicStringModule = require("magic-string");
const MagicString = MagicStringModule.default || MagicStringModule;

function transformScript(body, resourcePath = "") {
    const tree = acorn.parse(body, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true });
    const result = new MagicString(body);
    const networkEntry = /\/swai(?:\.[A-Za-z0-9]+)?\.js(?:\?|$)/.test(resourcePath);
    walk.simple(tree, {
        MemberExpression(node) {
            if (node.object.type === "Identifier" && ["window", "document", "globalThis", "self"].includes(node.object.name)
                && ((!node.computed && node.property.name === "location") || (node.computed && node.property.value === "location"))) {
                result.overwrite(node.start, node.end, "window.__unifiIngress.location");
            }
        },
        Property(node) {
            const callback = node.value;
            // Network's root Redux Saga handler currently discards its fatal errors.
            // Add diagnostics only; never restart a task or replay a device command.
            if (networkEntry && !node.computed && node.key.name === "onError"
                && callback.type === "ArrowFunctionExpression" && callback.params.length === 1
                && callback.params[0].type === "ObjectPattern" && callback.params[0].properties.length === 0
                && callback.body.type === "BlockStatement" && callback.body.body.length === 0) {
                result.overwrite(callback.start, callback.end, "(error)=>window.__unifiIngress.reportTaskError(error)");
            }
        }
    });
    return result.toString();
}
module.exports = { transformScript };
