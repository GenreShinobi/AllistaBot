module.exports = {
	name: 'join',
	description: 'Join the A-List Movie Group.',
	execute(message, args, db) {
		db.collection('guilds').doc(message.guild.id).collection('users').doc(message.author.id).get()
			.then((ref) => {
				if (ref.exists) {
					message.reply('It appears you are already an A-Lister. Good job!');
				}
				else {
					db.collection('guilds').doc(message.guild.id).collection('users').doc(message.author.id).set({
						'userID' : message.author.id,
						'userName' : message.author.username,
						'moviePoints' : 50,
						'moviesAttended' : 0,
						'dateJoined' : Date.now(),
					}).then(function() {
						message.reply('Congratulations! You are now on The A-List!');
					});
				}
			});
	},
};