'use strict';

var util = require('util');
var events = require('events');
var async = require('async');
var amqp = require('amqplib/callback_api');

var gdRabbitReconnectTimer = require('./gd_rabbit_reconnect_timer.js');

function gdRabbitConnector(params) {
	events.EventEmitter.call(this);
	
	if (params === undefined) {
		params = {};
	}
	
	this._host = params.host || 'localhost';
	this._port = params.port || 5672;
	this._user = params.user || 'guest';
	this._password = params.password || 'guest';
	this._exchangeName = params.exchangeName || 'gd_exchange';
	this._registredBindingKeys = [];
	
	this._resetVars();

	this._reconnectTimer = new gdRabbitReconnectTimer();
	
	this._autoReconnect = true;
	if (params.autoReconnect !== undefined) {
		this._autoReconnect = params.autoReconnect;
	}
	
	this._noLocal = true;
	if (params.noLocal !== undefined) {
		this._noLocal = params.noLocal;
	}
}

util.inherits(gdRabbitConnector, events.EventEmitter);

gdRabbitConnector.prototype._resetVars = function() {
	this._connected = false;
	this._connection = null;
	this._channel = null;
	this._queue = null;
	this._consumerTag = '';
}

gdRabbitConnector.prototype.connect = function() {
	if (this._connected) {
		throw new Error('already connected');
	}
	async.waterfall([
		this._connect.bind(this),
		this._createChannel.bind(this),
		this._assertExchange.bind(this),
		this._assertQueue.bind(this),
		this._listen.bind(this),
		this._bindQueues.bind(this)
	], this._setConnectionReady.bind(this));
}

gdRabbitConnector.prototype.send = function(routingKey, data) {
	if (!this._connected) {
		throw new Error('not connected');
	}
	return this._channel.publish(this._exchangeName, routingKey, new Buffer(data), {replyTo: this._consumerTag});
}

gdRabbitConnector.prototype.registerBindingKey = function(bindingKey, callback) {
	if (this._registredBindingKeys.indexOf(bindingKey) != -1) {
		return callback();
	}
	this._registredBindingKeys.push(bindingKey);
	
	if (!this._connected) {
		throw new Error('not connected');
	}
	
	this._bindQueue(bindingKey, callback);
}

gdRabbitConnector.prototype.isConnected = function() {
	return this._connected;
}

gdRabbitConnector.prototype._connect = function(callback) {
	var url = this._getConnectionUrl();
	amqp.connect(url, callback);
}

gdRabbitConnector.prototype._createChannel = function(connection, callback) {
	this._connection = connection;
	this._connection.createChannel(callback);
}

gdRabbitConnector.prototype._assertExchange = function(channel, callback) {
	this._channel = channel;
	
	var exOpts = {durable: false};
	
	this._channel.assertExchange(this._exchangeName, 'topic', exOpts, callback);
}

gdRabbitConnector.prototype._assertQueue = function(ok, callback) {
	var qOpts = {exclusive: true};
	this._channel.assertQueue('', qOpts, callback);
}

gdRabbitConnector.prototype._listen = function(ok, callback) {
	var cOpts = {noAck: true};
	this._queue = ok.queue;
	this._channel.consume(this._queue, this._messageHandler.bind(this), cOpts, callback);
}

gdRabbitConnector.prototype._bindQueues = function(serverReply, callback) {
	this._consumerTag = serverReply.consumerTag;
	async.each(this._registredBindingKeys, this._bindQueue.bind(this), callback);
}

gdRabbitConnector.prototype._bindQueue = function(bindingKey, callback) {
	var bOpts = {};
	this._channel.bindQueue(this._queue, this._exchangeName, bindingKey, bOpts, callback);
}

gdRabbitConnector.prototype._setConnectionReady = function(err) {
	if (err) return this._errorHandler(err);
	this._reconnectTimer.reset();
	this._connected = true;
	this.emit('connect');
}

gdRabbitConnector.prototype._getConnectionUrl = function() {
	return 'amqp://' + this._user + ':' + this._password + '@' +this._host + ':' + this._port;
}

gdRabbitConnector.prototype._messageHandler = function(message) {
	if (!this._noLocal || message.properties.replyTo !== this._consumerTag) {
		this.emit('message', this._formatIncomingMessage(message));
	}
}

gdRabbitConnector.prototype._formatIncomingMessage = function(message) {
	return {
		routingKey: message.fields.routingKey,
		data: message.content.toString()
	};
}

gdRabbitConnector.prototype._errorHandler = function(err) {
	this.emit('error', err);
	this._resetConnection();
	if (this._autoReconnect) {
		setTimeout(this.connect.bind(this), this._reconnectTimer.get());
		this._reconnectTimer.increase();
	}
}

gdRabbitConnector.prototype._resetConnection = function() {
	if (this._connection) {
		this._connection.close();
	}
	this._resetVars();
	this.emit('disconnect');
}

module.exports = gdRabbitConnector;