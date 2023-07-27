const device = require('./device.js');

module.exports = function (RED)
{
	function MkcMQTTIn(config)
	{
		RED.nodes.createNode(this, config);
		this.mkcHomie   = RED.nodes.getNode( config.mkcHomie);
		this.broker     = this.mkcHomie.broker;
		this.nodeID     = config.nodeID;
		this.propertyID = config.propertyID;

		this.state    = new device.MkcMqttDeviceState();
		this.node     = null;
		this.property = null;

		if (this.broker)
		{
            this.broker.register(this);
			
			// Client connected
			this.broker.client.on( "connect", () => {

				this.mkcHomie.registerIn( this.nodeID, this.propertyID);

				this.state.connected = true;
				this.setStatus();
			});

			this.myTimer = setInterval(() => {

				if( this.state.enable)
				{	
					// Device is ready, were there any received node or property message?
					
					if( this.node == null)
					{	// No
						this.error( `Node <${this.nodeID}> ${RED._("mkc-mqtt-in.notexist")}`);
					}
					else if( this.property == null)
					{	// No
						this.error( `Property <${this.nodeID}/${this.propertyID}> ${RED._("mkc-mqtt-in.notexist")}`);
					}

					clearInterval( this.myTimer);
					// this.log( "<${this.nodeID}/${this.propertyID}> ready");
				}
				else
				{
					// this.warn( "Device <${this.mkcHomie.deviceID} not ready -> retry in 5 seconds");
				}
			}, 5000);
		}

		// Node close
		this.on( "close", (removed, done) => {
			
			this.state.connected = false;
			this.setStatus();

			if (this.broker)
			{
				this.mkcHomie.deregister();
				this.broker.deregister( this, done);
			}
		});

		this.setStatus = () => {

			let myStatus = { fill: "red", shape: "dot", text: RED._("mkc-mqtt-in.disconnected")};
			if( this.state.connected)
			{
				myStatus.text = RED._("mkc-mqtt-in.connected");
				myStatus.fill = "yellow";

				if( this.state.ready2work)
				{
					myStatus.text += ", true";
					myStatus.fill  = "green";
				}
			}
			this.status( myStatus);
		};

		this.sendMessages = (topic) => {

			let myStatus = { "topic" : topic, "payload" : this.state.enable};
			myStatus[ "node"] = this.node;
			myStatus[ "property"] = this.property;

			let myEvent = {};
			if( this.node && this.property)
			{
				myEvent.topic = this.node["$name"];
				
				let dataType = this.property["$datatype"];
				if( dataType === "boolean")
				{
					myEvent.payload = ( this.property[`${this.propertyID}`] === "true");
				}
				else if( dataType === "float")
				{
					let myNumber = parseFloat( this.property[`${this.propertyID}`]);
					if( isNaN(myNumber))
					{
						this.warn( `Device <${this.mkcHomie.deviceID} no number`);
					}
					myEvent.payload = myNumber.toFixed(3);		
				}
				else
				{
					myEvent.payload = this.property[`${this.propertyID}`];
				}

				myEvent.enabled = (this.state.enable === true);
				if( myEvent.enabled)
				{
					myEvent.enabled = (this.property["$settable"] === "true");
				}
			}

			this.send( [myStatus, myEvent]);
		};

		this.mkcHomie.eventEmitter.on( "ready2work", (msg) =>
		{
			if( this.state.ready2work != msg.payload)
			{	
				this.state.ready2work = msg.payload;

				this.setStatus();
				this.sendMessages(`${this.mkcHomie.deviceID}`);
			}
		});

		this.mkcHomie.eventEmitter.on( `${this.mkcHomie.deviceID}/${this.nodeID}`, (msg) =>
		{
			this.node = msg.node;
			this.sendMessages(`${this.mkcHomie.deviceID}/${this.nodeID}`);
		});

		this.mkcHomie.eventEmitter.on( `${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}`, (msg) =>
		{
			this.property = msg.property;
			this.sendMessages(`${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}`);
		});
    };

	RED.nodes.registerType("mkc-mqtt-in", MkcMQTTIn);
};
