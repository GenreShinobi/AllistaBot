module.exports = {
	name: 'sing',
	description: 'Sing!',
	execute(message) {
		console.log('Called Sing.');
		message.channel.send('Do Re Mi Fa So La Ti Dooooo~~~');
	},
};