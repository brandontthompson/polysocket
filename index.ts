import { service, middleware, method, result, invoke, ensurefail, controller, HttpListener } from "polyservice";
import { Server, Socket } from "socket.io";

export default Server; 

export const socket:controller = {
	name: "socket", 
	init: init,
	bind: bind,
	middleware: middleware
}

let io:Server;
const services:service[] = [];

function init(options:{ httplistener:any }){
	if(io) return io;

	io = new Server(httplistener, {});

	for( let index = 0; index < middlewares.length; index++){
		const middleware:middleware | any = middlewares[index];
		io.of(middleware.namespace || "").use(middleware?.callback || middleware);
	}

	io.on('connection', function(socket:Socket){
		service.method.forEach((method:method, index:number) => {
			socket.on(service.name.toUpperCase() + "_" +method.name.toUpperCase(), function(content){
				resolver(socket, content, method);			
			});
		});
	});
}

function bind(service:service){
	service.push(service);
}

function middleware(middleware){
	middlewares.push(middleware);
	middlewareFunctions.push(middleware.callback.name);
}

async function resolver(socket:Socket, content:any, method:method){
	invoke(method, {...content, context: { socket:socket, io:io }}).then((resolve:result|ensurefail) => {
		if(!resolve || (typeof resolve !== "boolean" && ('blame' in (resolve as ensurefail)))) { console.log(resolve.toString()); return socket.emit('SOCKET_ERROR', resolve); }

		return socket.emit(method.name.toUpperCase(), resolve);
	});
}
