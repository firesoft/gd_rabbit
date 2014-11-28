GD-Rabbit library
==============

### gdRabbit

###### constructor param - object with following keys:
 * logger - logger object, must implement error method, default: console
 * rabbit - rabbitmq params: object with following keys: host, port, autoReconnect, noLocal
 
###### methods:
 * sendMessage(channel, message) - sends message to channel, message param should be object with 2 keys: action (string) and data or object of gdMBMessage
 * registerMessageHandler(bindingKey, callback) - register bindingKey message handler, callback will be called with one param: message - object with two fields: routingKey and data

###### events
 * connect
 * disconnect 
 
###### rabbitmq params object (for gdMessageBus contructor):
 * host [string] - host of rabbitmq server, default: localhost
 * port [int] - port of rabbitmq server, default: 5672
 * autoReconnect [boolean] - can reconnect on connection lost, default: true
 * noLocal [boolean] -  don't handle messages sent by me, default: true
 
###### routing/binding key:
Routing key must be a list of words, delimited by dots (or just one word). A message sent with a particular routing key will be delivered to all the queues that are bound with a matching binding key. Max length of routing key is 255 bytes.
The binding key must also be in the same form. However there are two important special cases for binding keys:
 * * (star) can substitute for exactly one word.
 * # (hash) can substitute for zero or more words.
example: 
A message with routing key "quick.orange.rabbit" will be delivered to queue with binding key "*.*.rabbit" or "*.orange.*", but not to "lazy.#".

 
Usage example
-------------

```javascript
var gdRabbit = require('gd_rabbit');

//create gdMessageBus object (and autmatically try to connect)
var gdRabbitObj = new gdRabbit({rabbit:{host: '192.168.0.214'}});

//we use connect event just once - on disconnect gd_rabbit will try reconnect and bind all callbacks once again (we can even bind events without connection)
gdRabbitObj.once('connect', function() {
	//register message handler for test channel
	gdRabbitObj.registerMessageHandler('test.*', function(message) {
		console.log(message.data);
	});
});

gdRabbitObj.connect();


//send message after 5secs to test channel with routing key: test and some cutom data
setTimeout(function() {
	gdMessageBusObj.sendMessage('test', {asd: 123, zxc: 345});
}, 5000);

setTimeout(function() {
	gdMessageBusObj.sendMessage('test.give', 49685);
}, 6000);

```