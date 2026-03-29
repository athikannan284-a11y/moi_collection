const net = require('net');

const client = new net.Socket();
const host = 'moi.rx5va34.mongodb.net'; // This is the host in the URI
const port = 27017;

console.log(`Connecting to ${host} on port ${port}...`);

client.connect(port, host, () => {
    console.log('SUCCESS: Reachable on port 27017');
    client.destroy();
});

client.on('error', (err) => {
    console.error('FAILED: Could not reach port 27017');
    console.error('Error:', err.message);
});

setTimeout(() => {
    console.log('Timeout: Could not reach port 27017 within 10s');
    client.destroy();
}, 10000);
