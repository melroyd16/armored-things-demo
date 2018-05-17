var GrovePi = require('../libs').GrovePi
var Commands = GrovePi.commands
var Board = GrovePi.board
var DHTDigitalSensor = GrovePi.sensors.DHTDigital
var LightAnalogSensor = GrovePi.sensors.LightAnalog
var LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog

require("dotenv").config();
const Protocol = require("azure-iot-device-amqp").Amqp;
const Client = require("azure-iot-device").Client;
const Message = require("azure-iot-common").Message;
const uuid = require("uuid");
var environmentUpdateInterval = 5*1000; // every 5 seconds
var sendInterval = null;

var client = Client.fromConnectionString(process.env.IOT_DEVICE_CONNECTIONSTRING, Protocol);


var board

function sendMessage(msg) {
  if (typeof msg !== "object") {
      log.err("programmer error: msg is not an object");
  }

  var message = new Message(JSON.stringify(msg));
  message.messageId = uuid.v4();

  client.sendEvent(message, function (err, result) {
    if (err) {
      log.err("send error:", err);
    }
  });
};

var testOptions = {
  acceleration: false,
  ultrasonic: false,
  airQuality: false,
  dhtDigital: false,
  lightAnalog: false,
  digitalButton: true,
  loudnessAnalog: false,
  rotaryAngle: true,
  dust: true,
  customAccelerationReading: false
}

function sendMessage(msg) {
  if (typeof msg !== "object") {
      log.err("programmer error: msg is not an object");
  }

  var message = new Message(JSON.stringify(msg));
  message.messageId = uuid.v4();

  client.sendEvent(message, function (err, result) {
    if (err) {
      log.err("send error:", err);
    }
  });
};

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

//        if (testOptions.dhtDigital) {
//          var dhtSensor = new DHTDigitalSensor(3, DHTDigitalSensor.VERSION.DHT22, DHTDigitalSensor.CELSIUS)
//          // Digital Port 3
//          // DHT Sensor
//          console.log('DHT Digital Sensor (start watch)')
//          dhtSensor.on('change', function (res) {
//            console.log('DHT onChange value=' + res)
//          })
//          dhtSensor.watch(500) // milliseconds
//        }

        if (testOptions.lightAnalog) {
          var lightSensor = new LightAnalogSensor(3)
          // Analog Port 3
          // Light Sensor
          console.log('Light Analog Sensor (start watch)')
          lightSensor.on('change', function (res) {
            console.log('Light onChange value=' + res)
            sendMessage({light:res})
          })
          lightSensor.watch()
        }

        if (testOptions.loudnessAnalog) {
          var loudnessSensor = new LoudnessAnalogSensor(2)
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
  console.log('Loudness avg value=' + res.avg + ' and max value=' + res.max)
  sendMessage({sound:res})
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
    client.on("error", function (err) {
      log.err("client error:", err);
      if (sendInterval) clearInterval(sendInterval);
      client.close();
    });
  }
});

// catches ctrl+c event
process.on('SIGINT', onExit)