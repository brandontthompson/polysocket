"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socket = exports.format = exports.contentFormat = void 0;
const polyservice_1 = require("polyservice");
const socket_io_1 = require("socket.io");
var contentFormat;
(function (contentFormat) {
    contentFormat["JSON"] = "JSON";
    contentFormat["XML"] = "XML";
    contentFormat["FILE"] = "FILE";
    contentFormat["TEXT"] = "TEXT";
    contentFormat["PARAM"] = "PARAM";
    contentFormat["CSV"] = "CSV";
})(contentFormat || (exports.contentFormat = contentFormat = {}));
exports.format = {};
exports.default = socket_io_1.Server;
exports.socket = {
    name: "socket",
    init: init,
    bind: bind,
    middleware: middleware
};
let io;
const services = [];
const middlewares = [];
const middlewareFunctions = [];
const properties = {
    caseOverride: true,
    useServiceName: true,
    errorValue: 'SOCKET_ERROR',
    errorCallback: errorCallback,
    connectionCallback: connectionCallback,
};
function init(options) {
    if (io)
        return;
    properties.caseOverride = (typeof options.caseOverride === "boolean") ? options.caseOverride : properties.caseOverride;
    properties.errorValue = overrideCase(options.errorValue || properties.errorValue || 'SOCKET_ERROR');
    properties.errorCallback = options.errorCallback || properties.errorCallback;
    properties.connectionCallback = options.connectionCallback || properties.connectionCallback;
    io = new socket_io_1.Server(options.httpserverout || options.httplistener.Instance.httpServer || options.httplistener, options.serveroptions);
    services.forEach((service) => {
        service.method.forEach((method) => {
            if (method.middleware && !Array.isArray(method.middleware)) {
                method.middleware = [method.middleware];
                middlewares.push(...(method.middleware));
            }
        });
    });
    for (let index = 0, len = middlewares.length; index < len; index++) {
        const middleware = middlewares[index];
        io.of(middleware.namespace || "/").use(resolveMiddleware(middleware));
    }
    io.on("connection", function (socket) {
        services.forEach((service) => {
            service.method.forEach((method, index) => {
                socket.on(overrideCase([options.userServiceName ? service.name : "", method.name].join("_")), resolver(method));
                //		  function(content:any){
                //		resolver(socket, content, method);			
                //			      });
            });
        });
        (properties.connectionCallback || connectionCallback)(socket);
    });
}
function bind(service) {
    services.push(service);
}
function middleware(middleware) {
    middlewares.push(middleware);
    middlewareFunctions.push(middleware.callback.name);
}
function resolveMiddleware(middleware) {
    return function (socket, next) {
        middleware.callback(next);
    };
}
//async function resolver(socket:Socket, content:any, method:method){
function resolver(method) {
    return function (socket, next, content) {
        //return function(socket:Socket, next:Function){
        //	need to parse the content so we can pass it to the func
        //	for text we can just return content but for others we need to use a method similar to polyexpress
        (0, polyservice_1.invoke)(method, Object.assign(Object.assign({}, content), { context: { socket: socket, io: io } })).then((resolve) => {
            if (!resolve || (typeof resolve !== "boolean" && ('blame' in resolve))) {
                console.log(resolve.toString());
                return ((properties === null || properties === void 0 ? void 0 : properties.errorCallback) || errorCallback)(socket, resolve);
            }
            console.log(resolve);
            return socket.emit(overrideCase(method.name), resolve);
        });
    };
}
function overrideCase(string) {
    return (properties.caseOverride) ? string.toUpperCase() : string;
}
function errorCallback(socket, resolve) {
    return socket.emit(overrideCase(properties.errorValue || 'SOCKET_ERROR'), resolve);
}
function connectionCallback(socket) {
    return socket.emit("connected");
}
