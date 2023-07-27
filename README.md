# @mkc-gmbh/node-red-mqtt-homie

Integrate [MKC](https://www.mkc-gmbh.de) products into the Node-RED application and provides easy access to your devices.

## Installation

The easiest way to install the nodes is to use the Manage palette option in the Node-RED editor menu. In the Install tab you can search for the @MKC/mqtt-homie package and click install. Once the installation is complete the nodes are available.

Alternatively you can install the nodes in your node-RED configuration folder

```bash
cd ~/.node-red
npm install ~/node-red-mqtt-homie
```

The nodes will be available after a restart of the Node-RED apllication.

## Usage

You can use the generic nodes to access every device. First create a configuration including the device suffix (e.g. enetio-1712bc) of your device. For more detailed information about the nodes and their configuration look at the help texts at the Node-RED editor.

## Release Notes

[CHANGELOG][def1]

## Examples

Note: Don't forget to change the MQTT configuration nodes to use these examples.

### eNetIO-1-a

![eNetIO-1-a][def2]

### Analog input

![Analog input][def3]

### Digital input

![Digital input][def6]

### Digital output

![Digital output][def4]

### Device state

![device state][def5]

## License

MKC under [MIT][def7].

[def1]: ./CHANGELOG.md
[def2]: examples/enetio-1-a.png "eNetIO-1-a"
[def3]: examples/mkc-mqtt-analog-in.png "Analog input"
[def4]: examples/mkc-mqtt-digital-out.png "Digital output"
[def5]: examples/mkc-mqtt-state.png "Device state"
[def6]: examples/mkc-mqtt-digital-in.png "Digital input"
[def7]: ./LICENSE
