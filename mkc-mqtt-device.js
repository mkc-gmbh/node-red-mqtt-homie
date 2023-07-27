const device = require('./device.js');

module.exports = function (RED)
{
	function MkcMQTTDevice(config)
	{
		RED.nodes.createNode(this, config);
		this.mkcHomie = RED.nodes.getNode( config.mkcHomie);
		this.broker   = this.mkcHomie.broker;

		this.state  = new device.MkcMqttDeviceState();
		this.device = null;
		
		if (this.broker)
		{
            this.broker.register(this);
			
			// Client connected
			this.broker.client.on( "connect", () =>
			{	// Register and subscribe device attributes
				this.mkcHomie.registerDevice();

				this.state.connected = true;
				this.setStatus();
			});
		}

		// Node close
		this.on( "close", (removed, done) =>
		{
			this.state.connected = false;
			this.setStatus();

			if (this.broker)
			{
				this.mkcHomie.deregister();
				this.broker.deregister( this, done);
			}
		});

		this.setStatus = () => {

			let myStatus = { fill: "red", shape: "dot", text: RED._("mkc-mqtt-device.disconnected")};
			if( this.state.connected)
			{
				myStatus.text = RED._("mkc-mqtt-device.connected");
				myStatus.fill = "yellow";
				
				if( this.state.ready2work)
				{
					myStatus.text += ", true";
					myStatus.fill  = "green";
				}
			}
			this.status( myStatus);
		};

		this.sendMessage = () =>
		{
			let myMsg = { "topic" : `${this.mkcHomie.deviceID}`, "payload" : this.state.enable, "device" : this.device};
			this.send( myMsg);
		};
		
		this.mkcHomie.eventEmitter.on( "ready2work", (msg) =>
		{
			this.state.ready2work = msg.payload;
			this.setStatus();

			this.sendMessage();
		});

		this.mkcHomie.eventEmitter.on( `${this.mkcHomie.deviceID}`, (msg) =>
		{
			this.device = msg.device;
			this.sendMessage();
		});
    };

	RED.nodes.registerType("mkc-mqtt-device", MkcMQTTDevice);
};
