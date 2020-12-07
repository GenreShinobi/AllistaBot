// Get the list
// Choose a movie from the list
// Confirm its a valid choice
// Give the option to accept or retry
// On retry, choose a new movie
// On accept, mark the movie as watched

const { DocumentSnapshot } = require("@google-cloud/firestore");
const { DiscordAPIError } = require("discord.js");
const { default: fetch } = require("node-fetch");
const Discord = require('discord.js');
const { timeStamp } = require("console");

module.exports = {
	name: 'choose',
	description: 'Choose a Movie',
	execute(message, args, db, bot) {

		// Awaits for and returns the a users response
		async function awaitResponse(msg, filter) {
			console.log('Method Called: awaitResponse(msg, filter)');
			let response;
			await msg.channel.awaitMessages(filter, {
				max: 1,
				time: 10000,
				errors: ['time'],
			})
				.then(res => {
					response = res.first();
				});
			return response;
		}

		// Function returns the movie by IMDB
		async function getMovieByIMDBID(ID) {
			console.log('Method Called: getMovieByIMDBID(ID)');
			let movie;
			await fetch(`http://www.omdbapi.com/?i=${ID}&apikey=69ad87c1`)
				.then(res => res.json())
				.then(data => {
					movie = data;
				});
			return movie;
		}

		async function updateMovieList(movie) {
			const guild = await bot.guilds.fetch(message.guild.id);
			if (!guild) return console.log('Unable to find guild.');

			const channel = await guild.channels.cache.get(movie.ChID);
			if (!channel) return console.log('Unable to find channel.');

			try {
				console.log(movie.msgID);
				const msg = await channel.messages.fetch(movie.MsgID)
					.catch(console.error);
				console.log('msg: ' + msg);
				const receivedEmbed = msg.embeds[0];
				const date = new Date();
				const newEmbed = new Discord.MessageEmbed(receivedEmbed)
					.setAuthor(`Was watched on ${date.toDateString()}!`)
					.setColor('#890E0A');
				msg.edit(newEmbed);

				db.collection('guilds').doc(guild.id).collection('alist').doc(movie.imdbID).update({
					'Watched' : true,
					'DateWatched' : Date.now(),
				});
			}
			catch (err) {
				console.error(err);
			}
		};

		async function chooseUnwatchedMovieList() {
			console.log('Method Called: getUnwatchedMovieList()');
			let tempList = [];
			const tempRef = await db.collection('guilds').doc(message.guild.id).collection('alist').where('Watched', '==', false).get();

			if (tempRef.empty) {
				console.log('No matching documents.');
				return;
			}

			tempRef.forEach(doc => {
				tempList.push(doc.data());
			});

			const chosenTitle = tempList[Math.floor(Math.random() * tempList.length)];
			const chosenMovie = await getMovieByIMDBID(chosenTitle.imdbID);
			console.log('Poster: ' + chosenMovie);

			let cEmbed;

			if(!chosenTitle.isCustom) {
				cEmbed = new Discord.MessageEmbed()
					.setColor('#50C878')
					.setAuthor('And the chosen movie is...')
					.setTitle(`${chosenTitle.Title}`)
					.setURL(`https://www.imdb.com/title/${chosenTitle.imdbID}`)
					.setAuthor('Is this movie ok?')
					.setThumbnail(`${chosenMovie.Poster}`)
					.setDescription(`${chosenMovie.Plot}`)
					.addFields(
						{ name: 'Released:', value: `${chosenMovie.Released}`, inline: true },
						{ name: 'Rated:', value: `${chosenMovie.Rated}`, inline: true },
						{ name: 'Genre:', value: `${chosenMovie.Genre}`, inline: true },
					);
			}
			else {
				cEmbed = new Discord.MessageEmbed()
					.setColor('#50C878')
					.setAuthor('And the chosen movie is...')
					.setTitle(`${chosenTitle.Title}`)
					.setAuthor('Is this movie ok?');
			}

			// deletes the users command
			message.delete();

			// Post and Get the Movie Choice Embed response.
			const cEmbedMsg = await message.channel.send(cEmbed);

			// Create a filter for the current user. 
			const filter = m => m.author.id === message.author.id;

			// Wait for a users response.
			const userResponse = await awaitResponse(cEmbedMsg, filter);

			if (userResponse.content.toUpperCase() === 'YES' || userResponse.content.toUpperCase() === 'Y') {
				userResponse.delete();
				userResponse.channel.send('Awesome! Enjoy your movie!');
				updateMovieList(chosenTitle);
			}

			return tempList;
		}
		async function asyncCalls() {
			console.log('Called: asyncCalls()');
			await chooseUnwatchedMovieList();
		}

		asyncCalls();
	},
};