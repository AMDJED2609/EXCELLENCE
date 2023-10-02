const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
const bodyParser = require('body-parser');
const moment = require('moment');
const momentTimezone = require('moment-timezone');
const DeviceDetector = require('node-device-detector');
const axios = require('axios');

const port = process.env.PORT || 3000;
let startTime;

// Initialize DeviceDetector
const deviceDetector = new DeviceDetector();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'))); 

// Enable JSON parsing for POST requests
app.use(bodyParser.json());

// Log and extract the last part of the path
app.use((req, res, next) => {
  const requestedPath = req.url;
  
  // Split the path by '/' and get the last part (excluding any query parameters)
  const parts = requestedPath.split('/');
  const lastPart = parts[parts.length - 1].split('?')[0];

  // Exclude specific paths you don't want to log
  if (lastPart !== 'jquery-1.12.4.min.js' && lastPart !== 'save_ip') {
    console.log(`Client requested path: ${lastPart}`);
  }
  next();
});


// Serve the main HTML file
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function formatAndPrint(header, data) {
  console.log(header);
  console.log(data);
  console.log('------------------------------------------------------------');
}
// Handle POST request to '/save_ip'
app.post('/save_ip', (req, res) => {
  const ipAddress = req.body.ipAddress;
  console.log('************************************** WaLID **************************************',);
  console.log('+++++++++++++++++++++++++++++++ User Conect IP Local +++++++++++++++++++++++++++++++',);
  console.log('Local IP address...:', ipAddress);
  res.json({ message: 'IP address received successfully' });
});

// Set the default timezone
momentTimezone.tz.setDefault('Africa/Algiers');

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('----------------------- user connected IP External -----------------------');

  // Handle 'getIP' event
  socket.on('getIP', async (data) => {
    const xForwardedFor = socket.request.headers['x-forwarded-for'];
    const externalIP = xForwardedFor ? xForwardedFor.split(',')[0].trim() : socket.request.connection.remoteAddress;
    const port = socket.request.connection.remotePort;

    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

    const userAgent = socket.request.headers['user-agent'];
    const deviceInfo = deviceDetector.detect(userAgent);

    console.log(`Timestamp..........: ${timestamp}`);
    console.log(`External IP........: ${externalIP}`);
    console.log(`Port...............: ${port}`);

    let serviceProvider = 'Not Available';
    let organization = 'Not Available';

    const fields = 'connection';

    try {
      const ipWhoisResponse = await axios.get(`http://ipwho.is/${externalIP}?output=json&fields=${fields}`);

      if (ipWhoisResponse.status === 200) {
        const responseData = ipWhoisResponse.data;
        serviceProvider = responseData.connection.isp;
        organization = responseData.connection.org;
        const currentTime = responseData.timezone.current_time;

        console.log(`IP Service Provider: ${serviceProvider}`);
        console.log(`Organization: ${organization}`);
      } else {
        console.error('Error fetching IP service provider: Unexpected status code', ipWhoisResponse.status);
      }
    } catch (error) {
      console.error('Error fetching IP service provider:', error.message);
    }

    console.log(`IP Service Provider.: ${serviceProvider}`);
    console.log(`Organization........: ${organization}`);
    formatAndPrint('Device Info......:', deviceInfo); // Separator after "Device Info" section



    // Emit 'ip' event with information
    socket.emit('ip', {
      externalIP,
      port,
      timestamp,
      deviceInfo,
      serviceProvider,
      organization,
    });
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startTime = new Date();
});
