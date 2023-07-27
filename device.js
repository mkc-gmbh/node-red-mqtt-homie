// The following device attributes are mandatory and MUST be send, even if it is just an empty string.
const deviceAttributes = new Map([
 ["$name", ""],
 ["$homie", ""],
 ["$nodes", ""],
 ["$extensions", ""],
 ["$state", ""]
 ]);

const nodeAttributes = new Map([
 ["$name", ""],
 ["$type", ""],
 ["$properties", ""]
 ]);

const propertyAttributes = new Map([
 ["$name", ""],
 ["$datatype", ""],
 ["$format", ""],
 ["$settable", "false"],
 ["$unit", ""]
 ]);

class MkcMQTTHomieDevice {

	constructor() 
	{
        this.subscriptions = new Map();
    }

	getDevice() 
	{
		const myDevice = new homieDevice();

		try
		{
			for( const key of deviceAttributes.keys())
			{
				if( this.subscriptions.has( key))
				{
					let keyValue = this.subscriptions.get( key);
					myDevice.attributes.set( key, keyValue);
				}
				else
				{
					throw `Attribute <${key}> not subscribed`;
				}
			}
		}
		catch( error)
		{
			// console.log( `getDevice(): ${error}`);
			return null;
		}
		
		return myDevice;
	}

	getNode(nodeID) 
	{
		const myNode = new homieNode();

		try
		{
			for( const key of nodeAttributes.keys())
			{
				let myKey = `${nodeID}/${key}`;
				if( this.subscriptions.has( myKey))
				{
					let keyValue = this.subscriptions.get( myKey);
					myNode.attributes.set( key, keyValue);
				}
				else
				{
					throw `Attribute <${myKey}> not subscribed`;
				}
			}
		}
		catch( error)
		{
			// console.log( `getNode(${nodeID}): ${error}`);
			return null;
		}
		
		return myNode;
	}

	getProperty(nodeID, propertyID) 
	{
		const myProperty = new homieProperty();

		try
		{
			let myKey = `${nodeID}/${propertyID}`;
			if( this.subscriptions.has( myKey))
			{
				let keyValue = this.subscriptions.get( myKey);
				myProperty.attributes.set( `${propertyID}`, keyValue);
			}
			else
			{
				throw `Attribute <${myKey}> not subscribed`;
			}

			for( const key of propertyAttributes.keys())
			{
				myKey = `${nodeID}/${propertyID}/${key}`;
				if( this.subscriptions.has( myKey))
				{
					let keyValue = this.subscriptions.get( myKey);
					myProperty.attributes.set( key, keyValue);
				}
				else
				{
					throw `Attribute <${myKey}> not subscribed`;
				}
			}
		}
		catch( error)
		{
			// console.log( `getNode(${nodeID}, ${propertyID}): ${error}`);
			return null;
		}
		
		return myProperty;
	}

	getDeviceSubscriptions()
	{
		return deviceAttributes;
	}
	
	getNodeSubscriptions(nodeID)
	{
		let myMap = new Map();
		
		// Add node attributes
		nodeAttributes.forEach( function( value, key)
		{
			myMap.set( `${nodeID}/${key}`, value);
		})
		
		return myMap;
	}

	getPropertySubscriptions(nodeID, propertyID)
	{
		let myMap = new Map();
		
		// Add the property itself
		myMap.set( `${nodeID}/${propertyID}`, "");
		// Add property attributes
		propertyAttributes.forEach( function( value, key)
		{
			myMap.set( `${nodeID}/${propertyID}/${key}`, value);
		})
		
		return myMap;
	}

	// Ready to work?
	get ready2work()
	{	
		const myDevice = this.getDevice();
		if( (myDevice == null) || !myDevice.ready2work)
		{
			return false;
		}
		
		const nodeArr = myDevice.nodes.split(",");
		for(let [,nodeID] of nodeArr.entries())
		{
			const myNode = this.getNode(nodeID);
			// Is this node subscribed?
			if( myNode != null)
			{	// Yes
				if( !myNode.ready2work)
				{
					// console.log(`ready2work(): Node ${nodeID} not ready`);
					return false;
				}

				const propertyArr = myNode.properties.split(",");
				for(let [,propertyID] of propertyArr.entries()) {
				
					const myProperty = this.getProperty(nodeID, propertyID);
					// Is this property subscribed?
					if( myProperty != null)
					{	// Yes
						if( !myProperty.ready2work)
						{
							// console.log(`ready2work(): Property ${nodeID}/${propertyID} not ready`);
							return false;
						}
					}
				}
			}
		}
		
		return true;
	}

	//	User friendly name of the device
	get name()
	{
		return this.subscriptions.get( "$name");
	}

	// Current state of the device
	get state()
	{
		return this.subscriptions.get( "$state");
	}
}

class MkcMqttDeviceState {

	constructor() 
	{
        this.attributes = new Map();
		this.attributes.set( "connected", false);
		this.attributes.set( "ready2work",  false);
    }

	get connected()
	{
		return this.attributes.get("connected");
	}
	
	set connected(enable)
	{
		this.attributes.set("connected", enable);
		if( !enable)
		{	// Disconnected
			this.ready2work = enable;
		}
	}

	get ready2work()
	{
		return this.attributes.get("ready2work");
	}

	set ready2work(enable)
	{
		this.attributes.set("ready2work", enable);
	}
	
	get enable()
	{
		return (this.ready2work && this.connected) ? true : false;
	}
}

class homieDevice {
    
	constructor() 
	{
        this.attributes = new Map();
    }

	// Supported nodes, separated by , for multiple ones.
	get nodes() {
		
		return this.attributes.get( "$nodes");
	}

	// True if nodes is not empty, otherwise false
	get isNodes() {
		
		let myNodes = this.nodes;
		if( (typeof myNodes === "string") && (myNodes.length > 0) )
		{
			return true;
		}
	}

	// True if the specified node is supported by the device, otherwise false
	isNode( nodeID)
	{
		if( this.isNodes)
		{
			const nodeArr = this.nodes.split(",");
			for(let [,value] of nodeArr.entries())
			{
				if( nodeID === value)
				{
					return true;
				}
			}
		}
		return false;
	}

	// Supported extensions, separated by , for multiple ones.
	get extensions() {
		
		return this.attributes.get( "$extensions");
	}

	// Friendly name of the device
	get name() {
		
		return this.attributes.get( "$name");
	}

	// True if the user friendly name is not empty, otherwise false
	get isName() {
		
		let myName = this.name;
		if( (typeof myName === "string") && (myName.length > 0) )
		{
			return true;
		}
		return false;
	}

	// The implemented Homie convention version
	get homie()
	{
		return this.attributes.get( "$homie");
	}

	// True if the implemented Homie version is 4.0.0, otherwise false
	get isHomie()
	{
		let myHomie = this.homie;
		if( (typeof myHomie === "string") && (myHomie === "4.0.0"))
		{
			return true;
		}
		return false;
	}

	// Current state of the device
	get state()
	{
		return this.attributes.get( "$state");
	}

	// True if the device state is ready to operate, otherwise false
	get isStateReady()
	{
		let myState = this.state;
		if( (typeof myState === "string") && (myState === "ready"))
		{
			return true;
		}
		return false;
	}

	// Returns true if the device is ready to operate
	get ready2work()
	{	
		// Were the mandantory device attributes set and is $state == ready?
		try
		{
			if( !this.isName)
			{
				throw `Attribute <Name : ${this.name}>`;
			}
			
			if( !this.isHomie)
			{
				throw `Attribute <Homie : ${this.homie}>`;
			}
			
			if( !this.isNodes)
			{
				throw `Attribute <Nodes : ${this.nodes}>`;
			}

			if( !this.isStateReady)
			{
				throw `Attribute <State : ${this.state}>`;
			}
		}
		catch( error)
		{
			// console.log( `homieDevice.ready2work: ${error}`);
			return false;
		}
		
		return true;
	}
}

class homieNode {
    
	constructor() 
	{
        this.attributes = new Map();
    }
	
	// Friendly name of the node
	get name() {
		
		return this.attributes.get("$name");
	}

	// True if the user friendly name is not empty, otherwise false
	get isName() {
		
		let myName = this.name;
		if( (typeof myName === "string") && (myName.length > 0) )
		{
			return true;
		}
		return false;
	}

	// The implemented type of the node
	get type() {
		
		return this.attributes.get("$type");
	}

	// True if the implemented type is not empty, otherwise false
	get isType() {
		
		let myType = this.type;
		if( (typeof myType === "string") && (myType.length > 0) )
		{
			return true;
		}
		return false;
	}

	// Supported properties, separated by , for multiple ones.
	get properties() {
		
		return this.attributes.get( "$properties");
	}

	// True if properties is not empty, otherwise false
	get isProperties() {
		
		let myProperties = this.properties;
		if( (typeof myProperties === "string") && (myProperties.length > 0) )
		{
			return true;
		}
	}

	// True if the specified property is supported by the node, otherwise false
	isProperty( propertyID) {

		if( this.isProperties)
		{
			const propertyArr = this.properties.split(",");
			for(let [,value] of propertyArr.entries())
			{
				if( propertyID === value)
				{
					return true;
				}
			}
		}
		
		return false;
	}

	// Returns true if the node is ready to operate
	get ready2work()
	{	
		// Were the mandantory device attributes set and is $state == ready?
		try
		{	
			if( !this.isName)
			{
				throw `Attribute <Name : ${this.name}>`;
			}
			
			if( !this.isType)
			{
				throw `Attribute <Type : ${this.type}>`;
			}
			
			if( !this.isProperties)
			{
				throw `Attribute <Properties : ${this.properties}>`;
			}

		}
		catch( error)
		{
			// console.log( `homieNode.ready2work: ${error}`);
			return false;
		}
		
		return true;
	}
}

class homieProperty {
    
	constructor() 
	{
        this.attributes = new Map();
    }
	
	// Friendly name of the property
	get name() {
		
		return this.attributes.get("$name");
	}

	// True if the user friendly name is not empty, otherwise false
	get isName() {
		
		let myName = this.name;
		if( (typeof myName === "string") && (myName.length > 0) )
		{
			return true;
		}
		return false;
	}

	// The implemented type of the property
	get datatype() {
		
		return this.attributes.get( "$datatype");
	}

	// True if datatype is not empty, otherwise false
	get isDatatype() {
		
		let myDataType = this.datatype;
		if( (typeof myDataType === "string") && (myDataType.length > 0) )
		{
			return true;
		}
	}

	// Specifies restrictions or options for the given data type
	get format() {
		
		return this.attributes.get( "$datatype");
	}

	// True if the property is settable, otherwise false
	get settable() {
		
		return this.attributes.get( "$settable");
	}

	// Specifies the unit
	get unit() {
		
		return this.attributes.get( "$unit");
	}

	// Returns true if the property is ready to operate
	get ready2work()
	{	
		// Were the mandantory device attributes set
		try
		{
			if( !this.isDatatype)
			{
				throw `Attribute <Datatype : ${this.datatype}>`;
			}
		}
		catch( error)
		{
			// console.log( `homieProperty.ready2work: ${error}`);
			return false;
		}
		
		return true;
	}
}

module.exports.MkcMQTTHomieDevice = MkcMQTTHomieDevice;
module.exports.MkcMqttDeviceState = MkcMqttDeviceState;

module.exports.homieDevice   = homieDevice;
module.exports.homieNode     = homieNode;
module.exports.homieProperty = homieProperty;
