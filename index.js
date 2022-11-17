"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socket = void 0;
const polyservice_1 = require("polyservice");
const socket_io_1 = require("socket.io");
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
    errorValue: 'SOCKET_ERROR',
    errorCallback: errorCallback,
    connectionCallback: connectionCallback
};
function init(options) {
    if (io)
        return io;
    properties.caseOverride = (typeof options.caseOverride === "boolean") ? options.caseOverride : properties.caseOverride;
    properties.errorValue = overrideCase(options.errorValue || properties.errorValue || 'SOCKET_ERROR');
    properties.errorCallback = options.errorCallback || properties.errorCallback;
    properties.connectionCallback = options.connectionCallback || properties.connectionCallback;
    io = new socket_io_1.Server(options.httplistener, {});
    for (let index = 0; index < middlewares.length; index++) {
        const middleware = middlewares[index];
        io.of(middleware.namespace || "").use((middleware === null || middleware === void 0 ? void 0 : middleware.callback) || middleware);
    }
    io.on('connection', function (socket) {
        services.forEach((service) => {
            service.method.forEach((method, index) => {
                socket.on(overrideCase(service.name + "_" + method.name), function (content) {
                    resolver(socket, content, method);
                });
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
function resolver(socket, content, method) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, polyservice_1.invoke)(method, Object.assign(Object.assign({}, content), { context: { socket: socket, io: io } })).then((resolve) => {
            if (!resolve || (typeof resolve !== "boolean" && ('blame' in resolve))) {
                console.log(resolve.toString());
                return ((properties === null || properties === void 0 ? void 0 : properties.errorCallback) || errorCallback)(socket, resolve);
            }
            return socket.emit(overrideCase(method.name), resolve);
        });
    });
}
function overrideCase(string) {
    return (properties.caseOverride) ? string.toUpperCase() : string;
}
function errorCallback(socket, resolve) {
    return socket.emit(overrideCase(properties.errorValue || 'SOCKET_ERROR'), resolve);
}
function connectionCallback(socket) {
}
