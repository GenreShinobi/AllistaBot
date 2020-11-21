module.exports = {
	name: 'join',
	description: 'Join the A-List Movie Group.',
	execute(message, args, db) {
		async function addRole(msg, roleID) {
			const role = await msg.guild.roles.fetch(roleID);
			message.member.roles.add(role);

		}

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
						'moviesAdded' : 0,
						'dateJoined' : Date.now(),
					}).then(function() {
						addRole(message, '634787377365254157');
						// message.member.roles.add(role);
						message.reply('Congratulations! You are now on The A-List!');
					});
				}
			});
	},
};