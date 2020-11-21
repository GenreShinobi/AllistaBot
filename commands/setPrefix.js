module.exports = {
	name: 'setprefix',
	description: 'Set Prefix',
	execute(message, args, db) {
		if (args.length === 0) {
			message.channel.send('Missing prefix');
		}
		else if (args.length === 1) {
			const nPrefix = args[0];

			db.collection('guilds').doc(message.guild.id).update({
				'prefix' : nPrefix,
			}).then(() => {
				message.channel.send(`[prefix update] : new prefix ${nPrefix} set`);
			});
		}
	},
};