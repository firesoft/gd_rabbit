'use strict';

var util = require('util');
var events = require('events');
var _ = require('lodash');

var gdRabbitConnector = require('./gd_rabbit_connector.js');
var bindingKeysHelper = require('./binding_keys_helper.js');

function gdRabbitBus(params) {

	events.EventEmitter.call(this);
	if (!params) {
		params = {};
	}

	var rabbitParams = this._getRabbitParams(params)

	this._messageHandlers = [];
	this._logger = params.logger || console;
	this._gdRabbit = new gdRabbitConnector(rabbitParams);
	this._bindRabbitEvents();
}

util.inherits(gdRabbitBus, events.EventEmitter);

gdRabbitBus.prototype.connect = function() {
	try {
		this._gdRabbit.connect();
	} catch(err) {
		this._rabbitErrorHandler(err);
	}
}

gdRabbitBus.prototype.sendMessage = function(routingKey, message) {
	try{
		this._validateRoutingKey(routingKey);
		message = this._prepareMessageToSend(message)
		this._gdRabbit.send(routingKey, message);
	} catch(err) {
		this._rabbitErrorHandler(err);
	}
}

gdRabbitBus.prototype.registerMessageHandler = function(bindingKey, handler) {
	try {		
		this._addToMessageHandlers(bindingKey, handler);
		this._gdRabbit.registerBindingKey(bindingKey, function(){});
	} catch(err) {
		this._rabbitErrorHandler(err);
	}
}

gdRabbitBus.prototype._validateRoutingKey = function(routingKey) {
	if (!bindingKeysHelper.isRoutingKeyValid(routingKey)) {
		throw new Error('invalid routing key: ' + routingKey);
	}
}

gdRabbitBus.prototype._validateBindingKey = function(bindingKey) {
	if (!bindingKeysHelper.isBindingKeyValid(bindingKey)) {
		throw new Error('invalid binding key: ' + bindingKey);
	}
}

gdRabbitBus.prototype._addToMessageHandlers = function(bindingKey, handler) {
	this._validateBindingKey(bindingKey);
	this._messageHandlers.push({bindingKey: bindingKey, handler: handler});
}

gdRabbitBus.prototype._prepareMessageToSend = function(message) {
	return JSON.stringify(message);
}

gdRabbitBus.prototype._getRabbitParams = function(params) {
	var rabbitParams = {};
	if (params.rabbit) {
		rabbitParams = params.rabbit;
	}
	return rabbitParams;
}

gdRabbitBus.prototype._bindRabbitEvents = function() {
	this._gdRabbit.on('error', this._rabbitErrorHandler.bind(this));
	this._gdRabbit.on('message', this._rabbitMessageHandler.bind(this));
	this._gdRabbit.on('connect', this._rabbitConnectHandler.bind(this));
	this._gdRabbit.on('disconnect', this._rabbitDisconnectHandler.bind(this));
}

gdRabbitBus.prototype._rabbitErrorHandler = function(error) {
	this._logger.error(error);
}

gdRabbitBus.prototype._rabbitConnectHandler = function() {
	this.emit('connect');
}

gdRabbitBus.prototype._rabbitDisconnectHandler = function() {
	this.emit('disconnect');
}

gdRabbitBus.prototype._rabbitMessageHandler = function(message) {
	message = this._parseRabbitMessage(message);
	if (!message) {
		return;
	}
	this._runMessageHandlers(message);
}

gdRabbitBus.prototype._runMessageHandlers = function(message) {
	this._messageHandlers.forEach(function(messageHandler) {
		if (bindingKeysHelper.checkBindingKeyAgainstRoutingKey(messageHandler.bindingKey, message.routingKey)) {
			messageHandler.handler(message);
		}
	});
}

gdRabbitBus.prototype._parseRabbitMessage = function(data) {
	try {
		data.data = JSON.parse(data.data);
		return data;
	} catch(err) {
		this._rabbitErrorHandler(err);
	}
	return false;
}

module.exports = gdRabbitBus;