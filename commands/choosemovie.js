// Get the list
// Choose a movie from the list
// Confirm its a valid choice
// Give the option to accept or retry
// On retry, choose a new movie
// On accept, mark the movie as watched

const { default: fetch } = require("node-fetch");

module.exports = {
	name: 'choose',
	description: 'Choose a Movie',
	execute(message, args, db, bot) {

		async function getUnwatchedMovieList() {
			console.log('Method Called: getUnwatchedMovieList()');
			const unwatchedList = await db.collection('guilds').doc(message.guild.id).collection('alist').get()
				.then((ref) => {
					if (ref.exists) {
						console.log('ref.data(): ' + ref.data());
						return ref.data();
					}
				});
			console.log('Unwatched List: ' + unwatchedList);
			return unwatchedList;
		}

		getUnwatchedMovieList();
		message.channel.send('Pong.');
	},
};