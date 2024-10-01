import { service, middleware, method, result, invoke, ensurefail, controller, HttpListener } from "polyservice";
import { Server, Socket } from "socket.io";

export enum contentFormat {
	JSON	= "JSON",
	XML	= "XML",
	FILE	= "FILE",
	TEXT	= "TEXT",
	PARAM	= "PARAM",
	CSV	= "CSV"
}

export const format = {

}

interface polysocketProperties {
	caseOverride:boolean;
	useServiceName:boolean;
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

const properties:Partial<polysocketProperties> = {
	caseOverride:true,
	useServiceName:true,
	errorValue:'SOCKET_ERROR',
	errorCallback:errorCallback,
	connectionCallback:connectionCallback,
}

function init(options:{ httplistener:any, serveroptions:any, httpserverout:any, caseOverride:boolean|undefined, userServiceName:boolean|undefined, errorValue:string|undefined, connectionCallback:Function, errorCallback:Function }){
	if(io) return;
	
	properties.caseOverride = (typeof options.caseOverride === "boolean") ? options.caseOverride : properties.caseOverride;
	properties.errorValue = overrideCase(options.errorValue || properties.errorValue || 'SOCKET_ERROR');
	properties.errorCallback = options.errorCallback || properties.errorCallback;
	properties.connectionCallback = options.connectionCallback || properties.connectionCallback;

	io = new Server(options.httpserverout || options.httplistener.Instance.httpServer || options.httplistener, options.serveroptions);

	services.forEach((service:service) => {
		service.method.forEach((method:method) => {
			if(method.middleware && !Array.isArray(method.middleware)){
			       	method.middleware = [method.middleware];
				middlewares.push(...(method.middleware));
			}
		});
	});

	for( let index = 0, len = middlewares.length; index < len; index++){
		const middleware:middleware | any = middlewares[index];
		io.of(middleware.namespace || "/").use(resolveMiddleware(middleware))
	}

	io.on("connection", function(socket:Socket){
		services.forEach((service:service) => {
			service.method.forEach((method:method, index:number) => {
				socket.on(overrideCase([options.userServiceName ? service.name : "", method.name].join("_")), resolver(method))

			//		  function(content:any){
			//		resolver(socket, content, method);			
			//			      });
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

function resolveMiddleware(middleware:middleware){
	return function(socket:Socket, next:Function){
		middleware.callback(next);
	}
}

//async function resolver(socket:Socket, content:any, method:method){
function resolver(method:method){

	return function(socket:Socket, next:Function, content:any){


	//return function(socket:Socket, next:Function){
	//	need to parse the content so we can pass it to the func
	//	for text we can just return content but for others we need to use a method similar to polyexpress
		invoke(method, {...content, context: { socket:socket, io:io }, /**next:next**/}).then((resolve:result|ensurefail) => {
			if(!resolve || (typeof resolve !== "boolean" && ('blame' in (resolve as ensurefail)))) { console.log(resolve.toString()); return (properties?.errorCallback||errorCallback)(socket, resolve); }

			console.log(resolve)


			return socket.emit(overrideCase(method.name), resolve);
		});
	}
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
