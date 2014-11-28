'use strict';

function isBindingKeyValid(bindingKey) {
	if (!/^(((\w+)|#|\*)\.)*((\w+)|#|\*)$/.test(bindingKey)) {
		return false;
	}
	return !(/(#\.\*)|(\*\.#)|(#\.#)/.test(bindingKey));
}

function isRoutingKeyValid(routingKey) {
	return /^(\w+\.)*[\w]+$/.test(routingKey);
}

function checkBindingKeyAgainstRoutingKey(bindingKey, routingKey) {
	var regExp = getRegExpression(bindingKey);
	return regExp.test(routingKey);
}

function getRegExpression(bindingKey) {
	return new RegExp(convertBindingKeyToPattern(bindingKey), 'g');
}

function convertBindingKeyToPattern(bindingKey) {
	return '^' + bindingKey.replace(/\./g,'\\.').replace(/\*/g, "\\w+").replace(/#/g, "(\\w+\\.)*[\\w]+") + '$';
}

module.exports.isBindingKeyValid = isBindingKeyValid;
module.exports.isRoutingKeyValid = isRoutingKeyValid;
module.exports.checkBindingKeyAgainstRoutingKey = checkBindingKeyAgainstRoutingKey;