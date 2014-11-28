'use strict';

function gdRabbitReconnectTimer(params) {
	if (params === undefined) {
		params = {};
	}

	this._minReconnectTime = params.minReconnectTime || 3000;
	this._maxReconnectTime = params.maxReconnectTime || 5 * 60 * 1000;

	this._currentReconnectTime = this._minReconnectTime;
}

gdRabbitReconnectTimer.prototype.get = function() {
	return this._currentReconnectTime;
}

gdRabbitReconnectTimer.prototype.reset = function() {
	this._currentReconnectTime = this._minReconnectTime;
}

gdRabbitReconnectTimer.prototype.increase = function() {
	this._currentReconnectTime *= 2;
	this._currentReconnectTime = Math.min(this._currentReconnectTime, this._maxReconnectTime);
}

module.exports = gdRabbitReconnectTimer;