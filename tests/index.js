var GrovePi = require('../libs').GrovePi
var Commands = GrovePi.commands
var Board = GrovePi.board
var DHTDigitalSensor = GrovePi.sensors.DHTDigital
var LightAnalogSensor = GrovePi.sensors.LightAnalog
var LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog
//var led = new GrovePi.sensors.DigitalOutput(3)
require("dotenv").config();
const Protocol = require("azure-iot-device-amqp").Amqp;
const Client = require("azure-iot-device").Client;
const Message = require("azure-iot-common").Message;
const uuid = require("uuid");
var environmentUpdateInterval = 5*1000; // every 5 seconds
var sendInterval = null;
var connectionString = process.env.CONNECTIONSTRING;
// console.log(connectionString);

var client = Client.fromConnectionString(connectionString, Protocol);
var dhtSensor = new DHTDigitalSensor(4, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS)


var board
//led.turnOn();
function sendMessage(msg) {
  if (typeof msg !== "object") {
      log.err("programmer error: msg is not an object");
  }
  console.log(msg);
  var message = new Message(JSON.stringify(msg));
  message.messageId = uuid.v4();

  client.sendEvent(message, function (err, result) {
    if (err) {
      console.log("error occured");
    }
  });
};

var testOptions = {
  dhtDigital: true,
  lightAnalog: true,
  loudnessAnalog: true
}

function start() {
  console.log('starting')

  board = new Board({
    debug: true,
    onError: function (err) {
      console.log('TEST ERROR')
      console.log(err)
    },
    onInit: function (res) {
      if (res) {

        console.log('GrovePi Version :: ' + board.version())

        if (testOptions.dhtDigital) {
          var dhtSensor = new DHTDigitalSensor(4, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS)
         dhtSensor.on('change', function (res) {
	    sendMessage({temperature:res[0],humidity:res[1],heat_index:res[2], type:'dht', deviceId:'sp1'})	

          })
          dhtSensor.watch(1000) // milliseconds
        }

        if (testOptions.lightAnalog) {
          var lightSensor = new LightAnalogSensor(2)
          console.log('Light Analog Sensor (start watch)')
          lightSensor.on('change', function (res) {
            //console.log('Light onChange value=' + res)
            sendMessage({light:res,type:'light', deviceId:'sp1'})
          })
          lightSensor.watch(1000)
        }
        if (testOptions.loudnessAnalog) {
          var loudnessSensor = new LoudnessAnalogSensor(0)
          loudnessSensor.start()
          setInterval(loudnessSensorGetAvgMax, 1000, loudnessSensor)
        }

      } else {
        console.log('TEST CANNOT START')
      }
    }
  })
  board.init()
}

function loudnessSensorGetAvgMax(loudnessSensor) {
  var res = loudnessSensor.readAvgMax()
  sendMessage({sound:res.avg, type:'sound',deviceId:'sp1'})
}



function onExit(err) {
  console.log('ending')
  board.close()
  process.removeAllListeners()
  process.exit()
  if (typeof err != 'undefined')
    console.log(err)
}

client.open(function (err, result) {
  if (err) {
    log.err("open error:", err);
  } else {
    start();
    // setInterval(getAllSensorData, 1000)
    client.on("error", function (err) {
      log.err("client error:", err);
      if (sendInterval) clearInterval(sendInterval);
      client.close();
    });
  }
});

// catches ctrl+c event
process.on('SIGINT', onExit)
