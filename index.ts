import { service, middleware, method, result, invoke, ensurefail, controller, HttpListener } from "polyservice";
import { Server, Socket } from "socket.io";

interface polysocketProperties {
	caseOverride:boolean;
	errorCallback:Function;
	connectionCallback:Function;
	errorValue:string;
}

export default Server; 

export const socket:controller = {
	name: "socket", 
	init: init,
	bind: bind,
	middleware: middleware
}

let io:Server;
const services:service[] = [];
const middlewares:middleware[] = [];
const middlewareFunctions:string[] = [];

//io = new Server(3000, {cors: {
//    origin: "*",
//    methods: ["GET", "POST"],
//    allowedHeaders: ["*"]
//  }});
//io.on("connection", function(socket:Socket){
//	console.log("CONN",socket)
//})

const properties:Partial<polysocketProperties> = {
	caseOverride:true,
	errorValue:'SOCKET_ERROR',
	errorCallback: errorCallback,
	connectionCallback: connectionCallback
}

function init(options:{ httplistener:any, serveroptions:any, httpserverout:any, caseOverride:boolean|undefined, errorValue:string|undefined, connectionCallback:Function, errorCallback:Function }){
	if(io) return;
	
	properties.caseOverride = (typeof options.caseOverride === "boolean") ? options.caseOverride : properties.caseOverride;
	properties.errorValue = overrideCase(options.errorValue || properties.errorValue || 'SOCKET_ERROR');
	properties.errorCallback = options.errorCallback || properties.errorCallback;
	properties.connectionCallback = options.connectionCallback || properties.connectionCallback;

	io = new Server(options.httplistener?.Instance.httpServer, options.serveroptions);
	//io = new Server(options.port, options.serveroptions);

	for( let index = 0; index < middlewares.length; index++){
		const middleware:middleware | any = middlewares[index];
		io.of(middleware.namespace || null).use(middleware?.callback || middleware);
	}

	io.on("connection", function(socket:Socket){
		console.log(socket.connected)
		services.forEach((service:service) => {
			console.log(service)
			service.method.forEach((method:method, index:number) => {
				console.log(method.name)
				socket.on(overrideCase(service.name + "_" + method.name), function(content){
					resolver(socket, content, method);			
				});
			});
		});
		(properties.connectionCallback||connectionCallback)(socket);
	});
}

function bind(service:service){
	services.push(service);
}

function middleware(middleware:middleware){
	middlewares.push(middleware);
	middlewareFunctions.push(middleware.callback.name);
}

async function resolver(socket:Socket, content:any, method:method){
	invoke(method, {...content, context: { socket:socket, io:io }}).then((resolve:result|ensurefail) => {
		if(!resolve || (typeof resolve !== "boolean" && ('blame' in (resolve as ensurefail)))) { console.log(resolve.toString()); return (properties?.errorCallback||errorCallback)(socket, resolve); }

		return socket.emit(overrideCase(method.name), resolve);
	});
}

function overrideCase(string:string):string{
	return (properties.caseOverride) ? string.toUpperCase() : string;
}

function errorCallback(socket:Socket, resolve:any){
	return socket.emit(overrideCase(properties.errorValue || 'SOCKET_ERROR'), resolve);
}

function connectionCallback(socket:Socket){	
	return socket.emit("connected");
}
