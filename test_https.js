const https = require('https');
const tls = require('tls');

const url = 'https://ordina.se';

const req = https.request(url, { method: 'GET' }, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);

  // Check SSL certificate
  const socket = res.socket;
  const cert = socket.getPeerCertificate();

  if (cert) {
    console.log('SSL Certificate found.');
    console.log(`Subject: ${cert.subject.CN}`);
    console.log(`Issuer: ${cert.issuer.CN}`);
    console.log(`Valid From: ${cert.valid_from}`);
    console.log(`Valid To: ${cert.valid_to}`);

    // Check if certificate is valid (not expired)
    const now = new Date();
    const validFrom = new Date(cert.valid_from);
    const validTo = new Date(cert.valid_to);

    if (now >= validFrom && now <= validTo) {
      console.log('Certificate is valid.');
    } else {
      console.log('Certificate is expired or not yet valid.');
    }
  } else {
    console.log('No SSL certificate found.');
  }

  res.on('data', () => {}); // Consume data
  res.on('end', () => {
    console.log('Request completed successfully.');
  });
});

req.on('error', (err) => {
  console.error(`Request failed: ${err.message}`);
});

req.end();