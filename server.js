var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

const fs = require('fs');
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

fs.readFile('./config.json', (err, data) => {
	if (err) {
		console.warn('No settings found. Will start with defaults.');
		service();
	} else {
		service(JSON.parse(data));
	}
});

const DEFAULT_SETTINGS = {
	opening_secret: 'abracadabra',
	channel_timeout_seconds: 10
};
const openChannels = [];

const service = (settings = DEFAULT_SETTINGS) => {
	http.listen(settings.port || 3001, function() {
		console.log('listening on *:3001');
	});
	io.on('connection', function(socket) {
		console.log('user connected');
		socket.on('open', (message) => {
			const parsedMessage = JSON.parse(message);
			console.log('someone tries to open', parsedMessage.channels);
			if (parsedMessage.secret === settings.opening_secret) {
				console.log('access granted for ', parsedMessage.channels);
				(parsedMessage.channels || []).forEach((channel) => {
					openChannels.push(channel);
					console.log('access granted for:', channel);

					socket.on(channel, (message) => {
						console.log('broadcast:', channel, message);
						socket.broadcast.emit(channel, message);
					});
				});
				setTimeout(() => {
					(parsedMessage.channels || []).forEach((channel) => {
						socket.removeAllListeners(channel);
						let i = openChannels.indexOf(channel);
						if (i >= 0) {
							openChannels.splice(i, 1);
							console.log('removed channel ' + channel + ' from open channels list.');
						}
					});
				}, 1000 * (parsedMessage.timeoutS || settings.channel_timeout_seconds));
			} else {
				console.log('access denied for ', parsedMessage.channels);
			}
		});
	});
};
