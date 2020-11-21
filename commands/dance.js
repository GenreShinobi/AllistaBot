const giphyApi = require('giphy-api')('ijGZ3J5aIgMguxWrrvBCgxBnFjrhvH4m');

module.exports = {
	name: 'dance',
	description: 'Dance!',
	execute(message) {
		giphyApi.random({
			tag: 'dance',
			rating: 'pg-13',
			fmt: 'json',
		}, function(err, res) {
			message.channel.send(res.data.url);
		});
	},
};