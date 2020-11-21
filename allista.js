/* eslint-disable no-unused-vars */
const fs = require('fs');
const settings = require('./config.json');
const giphy = require('giphy-api');


// require the discord.js module
const Discord = require('discord.js');

// create a new Discord client
let prefix;
const token = settings.token;
const client = new Discord.Client(token);

// initialize firebase
const firebase = require('firebase/app');
const fieldValue = require('firebase-admin').firestore.FieldValue;
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// initialize command collection
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value was the exported module
	client.commands.set(command.name, command);
}

// when the client is ready, run this code
// this event will trigger one time after logging in
client.once('ready', () => {
	console.log('Ready!');
});

// login to Discord with app token stored as an environment variable.
client.login(token);

client.on('message', message => {
	db.collection('guilds').doc(message.guild.id).get().then((q) => {
		if (q.exists) {
			prefix = q.data().prefix;
		}
	}).then(() => {
		if (!message.content.startsWith(prefix) || message.author.bot) return;

		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const command = args.shift().toLowerCase();

		if (!client.commands.has(command)) {
			message.reply(`I'm sorry I don't understand. Perhaps ${message.guild.owner} can teach me?`);
		}
		else {
			try {
				client.commands.get(command).execute(message, args, db);
			}
			catch (error) {
				console.error(error);
				message.reply('I\'m sorry, but something went wrong when trying to execute that command.');
			}
		}
	});
});

client.on('guildCreate', async gData => {
	db.collection('guilds').doc(gData.id).set({
		'guildID' : gData.id,
		'guildName' : gData.name,
		'guildOwnerID' : gData.ownerID,
		'guildMemberCount' : gData.memberCount,
		'prefix' : '!',
	});
});