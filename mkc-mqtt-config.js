const events = require("events");
const device = require('./device.js');

module.exports = function (RED) {
	
	function MkcMQTTConfig(config) {
		
		RED.nodes.createNode(this, config);

		this.eventEmitter = new events.EventEmitter();
		this.eventEmitter.setMaxListeners( 20);

		this.broker = RED.nodes.getNode( config.broker);
		this.rootID = config.rootID;
		this.deviceID = config.deviceID;

		this.registeredNodes = 0;

		// Our MKC MQTT device
		this.device = new device.MkcMQTTHomieDevice();
		this.ready2work = false;
		
		// Node close
		this.on( "close", (removed, done) => {
			
			done();
			this.log( RED._("mkc-mqtt-config.closed"));
		});
		
		this.registerDevice = () => {
			
			this.registeredNodes++;
			
			let myMap = this.device.getDeviceSubscriptions();
			for(const [key, value] of myMap.entries()) {
				
				this.subscribeKey( key, value);
			}
		};

		this.registerIn = (nodeID, propertyID) => {
			
			this.registerDevice();

			let myMap = this.device.getNodeSubscriptions( nodeID);
			for(const [key, value] of myMap.entries()) {
				
				this.subscribeKey( key, value);
			}

			myMap = this.device.getPropertySubscriptions( nodeID, propertyID);
			for(const [key, value] of myMap.entries()) {
				
				this.subscribeKey( key, value);
			}
		};

		this.deregister = () => {

			if( this.registeredNodes > 0)
			{
				if( this.registeredNodes == 1)
				{
					// Unsubscribe all subsriptions
					if( this.device.subscriptions.size > 0)
					{
						for (const key of this.device.subscriptions.keys())
						{
							let topic = `${this.rootID}/${this.deviceID}/${key}`;
							this.broker.unsubscribe( topic);
						}
						this.device.subscriptions.clear();
					}
				}
				
				this.registeredNodes--;
			}
			else
			{
				this.warn( `deregister(): registeredNodes = ${this.registeredNodes}`);
			}
		};

		this.subscribeKey = (key, value) => {
			
			// Subscribe only if the key doesn't exist
			if( !this.device.subscriptions.has( key))
			{	
				// console.log(`subscribe: ${key}`);
				// Set the key with empty value
				this.device.subscriptions.set( key, value);
				// Build the device topic 
				let topic = `${this.rootID}/${this.deviceID}/${key}`;
				// Subscribe the topic
				this.broker.subscribe( topic, { qos: 1 }, (topic, payload) => {

					handleSubscription( this, topic, payload);
				});
			}
		};
	}

	// MQTT publish received for subscriptions
	function handleSubscription(node, topic, payload)
	{
		try		
		{
			const topicArr = topic.split("/");
			if( (topicArr[0] !== node.rootID) || (topicArr[1] !== node.deviceID))
			{
				throw `<${topic}> does not fit for <${node.rootID}/${node.deviceID}>`;
			}
			
			// Slice out rootID and deviceID
			topic = topic.slice( topicArr[0].length + topicArr[1].length + 2);
			// Payload
			payload = payload.toString();
		
			if( node.device.subscriptions.has( topic))
			{	
				// Is there a change?
				if( node.device.subscriptions.get( topic) === payload)
				{	// No -> Nothing to do
					return;
				}
				// Yes -> Set new payload
				node.device.subscriptions.set( topic, payload);
				// node.log( `${topic} -> ${payload}`);
			}
			else
			{
				throw `<${topic}> not subscribed>`;
			}

			const homieArr = topic.split("/");
			if( homieArr.length == 1)
			{	// Device message
				let myMsg = {"topic" : topic, "payload" : payload};

				let myDevice = node.device.getDevice();
				myMsg["device"] = Object.fromEntries( myDevice.attributes);
				
				node.eventEmitter.emit( `${node.deviceID}`, myMsg);
			}
			else if ( (homieArr.length == 2) || (homieArr.length == 3))
			{	
				let nodeID = homieArr[0];
				let propertyID = homieArr[1];

				let myMsg = {"topic" : topic, "payload" : payload};
				let myNode = node.device.getNode( nodeID);
				myMsg[ "node"] = Object.fromEntries( myNode.attributes);
				if( myNode.attributes.has( propertyID))
				{	
					node.eventEmitter.emit( `${node.deviceID}/${nodeID}`, myMsg);
				}
				else
				{
					let myProperty = node.device.getProperty( nodeID, propertyID);
					myMsg[ "property"] = Object.fromEntries( myProperty.attributes);
					
					node.eventEmitter.emit( `${node.deviceID}/${nodeID}/${propertyID}`, myMsg);
				}
			}

			let ready2work = node.device.ready2work;
			if( ready2work != node.ready2work)
			{
				node.ready2work = ready2work;

				let myMsg = {"topic" : "ready2work", "payload" : ready2work};
				node.eventEmitter.emit( "ready2work", myMsg);
			}
		}
		catch( error)
		{
			node.error( `handleSubscription(): ${error}`);
		}
	};

	RED.nodes.registerType("mkc-mqtt-config", MkcMQTTConfig);
};