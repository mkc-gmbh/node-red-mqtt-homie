const device = require('./device.js');

module.exports = function (RED)
{
	function MkcMQTTOut(config)
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

            this.on( "input", function( msg, send, done) 
			{
				try
				{
					if( !msg.hasOwnProperty("payload"))
					{
						throw `Undefined payload`;
					}

					if( !this.state.enable)
					{
						throw `Device <${this.mkcHomie.deviceID}}> not ready`;
					}

					if( !this.property["$settable"])
					{
						throw `Property <${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}> not settable`;
					}

					if( this.property["$datatype"] === "float")
					{
						if( typeof msg.payload != "number")
						{
							throw `Property <${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}> datatype is ${typeof msg.payload}`;
						}
						msg.payload = msg.payload.toFixed(3);
					}
					else if( this.property["$datatype"] != typeof msg.payload)
					{
						throw `Property <${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}> wrong datatype`;
					}
					
	                msg.qos   = 1;
					msg.topic = `${this.mkcHomie.rootID}/${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}/set`;

					this.broker.publish( msg, function(err)
					{
						done(err);
					});
				}
				catch( error)
				{
					this.error( `${error}`);
					done();
				}

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

			let myStatus = { fill: "red", shape: "dot", text: RED._("mkc-mqtt-out.disconnected")};
			if( this.state.connected)
			{
				myStatus.text = RED._("mkc-mqtt-out.connected");
				myStatus.fill = "yellow";

				if( this.state.ready2work)
				{
					myStatus.text += ", true";
					myStatus.fill  = "green";
				}
			}
			this.status( myStatus);
		};

		this.sendEventMessage = (topic) => {

			let myMsg = {"topic" : topic, "payload" : `${this.state.enable}`};
			myMsg[ "node"] = this.node;
			myMsg[ "property"] = this.property;

			this.send( myMsg);
		};

		this.mkcHomie.eventEmitter.on( "ready2work", (msg) =>
		{
			if( this.state.ready2work != msg.payload)
			{	
				this.state.ready2work = msg.payload;

				this.setStatus();
//				this.sendEventMessage(`${this.mkcHomie.deviceID}`);
			}
		});

		this.mkcHomie.eventEmitter.on( `${this.mkcHomie.deviceID}/${this.nodeID}`, (msg) =>
		{
			this.node = msg.node;
//			this.sendEventMessage(`${this.mkcHomie.deviceID}/${this.nodeID}`);
		});

		this.mkcHomie.eventEmitter.on( `${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}`, (msg) =>
		{
			this.property = msg.property;
//			this.sendEventMessage(`${this.mkcHomie.deviceID}/${this.nodeID}/${this.propertyID}`);
		});
    };

	RED.nodes.registerType("mkc-mqtt-out", MkcMQTTOut);
};
