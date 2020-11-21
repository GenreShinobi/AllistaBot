const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
	name: 'add',
	description: 'Add Movies to the A-List.',
	execute(message, args, db, bot) {

		// Function returns the first movie in list
		async function getFirstMovie(list) {
			console.log('Called: getFirstMovie()');
			const movie = await getMovieByIMDBID(list.Search[0].imdbID);
			return movie;
		}

		// Function returns the movie by IMDB
		async function getMovieByIMDBID(ID) {
			let movie;
			await fetch(`http://www.omdbapi.com/?i=${ID}&apikey=69ad87c1`)
				.then(res => res.json())
				.then(data => {
					movie = data;
				});
			return movie;
		}

		// Function returns the search results of an OMDB API Call
		async function getList() {
			console.log('Called: getList()');
			let list;
			await fetch(`http://www.omdbapi.com/?s=${args.join('+')}&apikey=69ad87c1`)
				.then(res => res.json())
				.then(data => {
					list = data;
				});
			return list;
		}

		// Function returns the eligibility of a user to add to the list
		async function getEligibility() {
			console.log('Called: getEligibility()');
			const eligibility = await db.collection('guilds').doc(message.guild.id).collection('users').doc(message.author.id).get()
				.then((ref) => {
					// if the user is a member, move forward
					if (ref.exists) {
						// if the user has a positive movie point value, move forward.
						if (ref.data().moviePoints > 0) {
							return true;
						}
					}
				});
			return eligibility;
		}

		// Awaits for and returns the a users response
		async function awaitResponse(msg, filter) {
			let response;
			await msg.channel.awaitMessages(filter, {
				max: 1,
				time: 15000,
				errors: ['time'],
			})
				.then(res => {
					response = res.first();
					console.log('Got Response: ' + response);
				});
			return response;
		}

		// Adds movie to alist in Firebase
		async function pushMovie(msg, movie, isCustom) {
			if(isCustom) {
				db.collection('guilds').doc(message.guild.id).collection('alist').doc(movie).set({
					'imdbID' : null,
					'AddedBy' : msg.author.username,
					'DateAdded' : Date.now(),
					'Title' : movie,
					'isCustom' : true,
					'Watched' : false,
				}).then(function() {
					msg.channel.send('Addition was successful!');
					postCustomMovie(msg, movie);
				}).catch(function(err) {
					console.log(err);
					msg.channel.send('An error occured when adding that movie to the list... Aborting.');
				});
			}
			else {
				db.collection('guilds').doc(message.guild.id).collection('alist').doc(movie.imdbID).get()
					.then((ref) => {
						if (ref.exists) {
							message.reply('This appears to be a popular choice, it is already on the list.');
						}
						else {
							db.collection('guilds').doc(message.guild.id).collection('alist').doc(movie.imdbID).set({
								'imdbID' : movie.imdbID,
								'AddedBy' : msg.author.username,
								'DateAdded' : Date.now(),
								'Title' : movie.Title,
								'isCustom' : false,
								'Watched' : false,
							}).then(function() {
								msg.reply('Addition was successful');
								postIMDBMovie(msg, movie);
							}).catch(function(err) {
								console.log(err);
								msg.channel.send('An error occured when adding that movie to the list... Aborting.');
							});
						}
					});
			}
		}

		// Posts the Movie to the List channel -- IMDB Movie
		async function postIMDBMovie(msg, movie) {
			const pEmbed = new Discord.MessageEmbed()
				.setColor('#2A9D8F')
				.setTitle(`${movie.Title}`)
				.setURL(`https://www.imdb.com/title/${movie.imdbID}`)
				.setThumbnail(`${movie.Poster}`)
				.setDescription(`${movie.Plot}`)
				.addFields(
					{ name: 'Released:', value: `${movie.Released}`, inline: true },
					{ name: 'Rated:', value: `${movie.Rated}`, inline: true },
					{ name: 'Genre:', value: `${movie.Genre}`, inline: true },
					{ name: 'Runtime', value: `${movie.Runtime}`, inline: true },
					{ name: 'Director', value: `${movie.Director}`, inline: true },
					{ name: 'Actors', value: `${movie.Actors}`, inline: true },
					{ name: 'Metascore', value: `${movie.Metascore}`, inline: true },
					{ name: 'IMDB Rating', value: `${movie.imdbRating}`, inline: true },
				)
				.setTimestamp()
				.setFooter(`Added by ${msg.author.username}`);
			const channel = bot.channels.cache.get('779747280735567933');
			channel.send(pEmbed);
		}

		// Post the Movie to the List Channel -- Custom Movie
		async function postCustomMovie(msg, movie) {
			const pEmbed = new Discord.MessageEmbed()
				.setColor('#2A9D8F')
				.setTitle(`${movie}`)
				.setDescription('IMDB Info was not found for this entry. That is ok! It is added to the list and we can tackle it when it gets drawn.')
				.setTimestamp()
				.setFooter(`Added by ${msg.author.username}`);
			console.log(msg.member.guild.channels);
			const channel = bot.channels.cache.get('779747280735567933');
			channel.send(pEmbed);
		}

		async function asyncCalls() {
			console.log('Called: asyncCalls()');
			const eligibility = await getEligibility();

			// Check user Eligibility before proceeding with async addMovie calls.
			if(eligibility) {
				const list = await getList();
				let movie = await getFirstMovie(list);

				// constructs the Movie Embed
				const mEmbed = new Discord.MessageEmbed()
					.setColor('#0099ff')
					.setTitle(`${movie.Title}`)
					.setURL(`https://www.imdb.com/title/${movie.imdbID}`)
					.setAuthor('Is this the right movie?')
					.setThumbnail(`${movie.Poster}`)
					.setDescription(`${movie.Plot}`)
					.addFields(
						{ name: 'Released:', value: `${movie.Released}`, inline: true },
						{ name: 'Rated:', value: `${movie.Rated}`, inline: true },
						{ name: 'Genre:', value: `${movie.Genre}`, inline: true },
					);

				// deletes the users command.
				message.delete();

				// Post and Get the Movie Embed response.
				const mEmbedMsg = await message.channel.send(mEmbed);

				// Create a filter for the current user.
				const filter = m => m.author.id === message.author.id;

				// Wait for a get users response.
				let userResponse = await awaitResponse(mEmbedMsg, filter);

				// Check the response
				if (userResponse.content.toUpperCase() == 'YES' || userResponse.content.toUpperCase() == 'Y') {
					userResponse.delete();
					mEmbedMsg.delete();
					pushMovie(userResponse, movie, false);
				}
				else if (userResponse.content.toUpperCase() == 'NO' || userResponse.content.toUpperCase() == 'N') {
					// eslint-disable-next-line prefer-const
					let titleArray = [];
					// eslint-disable-next-line prefer-const
					let dateArray = [];
					// eslint-disable-next-line prefer-const
					let imdbArray = [];

					// Get the max # of results
					let max = Object.keys(list.Search).length - 1;

					// If the max # of results is > 10, limit it to the top 10
					// Reason: formatting becomes an issue with longer lists.
					if (max > 10) { max = 10; }

					// Generate the arrays that will be used as the value of the inline fields of the Embed
					for (let i = 0; i < max; i++) {
						titleArray.push(`[${i + 1}] ${list.Search[i + 1].Title}`);
						dateArray.push(list.Search[i + 1].Year);
						imdbArray.push(`[Link](https://www.imdb.com/title/${list.Search[i + 1].imdbID})`);
					}

					// Construct the List Embed for displaying the fallback list.
					const lEmbed = new Discord.MessageEmbed()
						.setColor('#0099ff')
						.setAuthor('Any of these the correct movie?')
						.addFields(
							{ name: 'ID/Title', value: `${titleArray.join('\n')}`, inline: true },
							{ name: 'Date', value: `${dateArray.join('\n')}`, inline: true },
							{ name: 'IMDB', value: `${imdbArray.join('\n')}`, inline: true },
						);

					// Remove the users command line.
					userResponse.delete();

					// Remove the previous Movie Embed post.
					mEmbedMsg.delete();

					// Post and get the List embed post.
					const lEmbedMsg = await message.channel.send(lEmbed);

					// eslint-disable-next-line no-constant-condition
					waitForResponse: while(true) {
						// Wait for the users response.
						userResponse = await awaitResponse(lEmbedMsg, filter);

						// Delete the users command from the chat.
						userResponse.delete();

						// TODO: Consider moving this processing into a function
						if (userResponse.content.toUpperCase() == 'YES' || userResponse.content.toUpperCase() == 'Y') {
							// If the restponse was yes, ask for the ID
							userResponse.channel.send('Ok, just respond with the ID number.')
								.then(sentMessage => {
									sentMessage.delete({ timeout: 5000 });
								});
							continue waitForResponse;
						}
						else if (userResponse.content > 0 && userResponse.content < max + 1) {
							// If the response was a valid ID, add the movie.
							lEmbedMsg.delete();
							movie = await getMovieByIMDBID(list.Search[userResponse.content].imdbID);
							pushMovie(userResponse, movie, false);
							break;
						}
						else if (userResponse.content < 1 || userResponse.content > max + 1) {
							// If the response was not a valid ID, ask again.
							userResponse.channel.send('Sorry, that ID was not valid.');
							continue waitForResponse;
						}
						else if (userResponse.content.toUpperCase() == 'NO' || userResponse.content.toUpperCase() == 'N') {
							const cEmbed = new Discord.MessageEmbed()
								.setColor('#0099ff')
								.setAuthor('Ok, we can add a custom entry.')
								.setDescription('Just reply with the full title of the movie.');
							lEmbedMsg.delete();
							const cEmbedMsg = await userResponse.channel.send(cEmbed);
							userResponse = await awaitResponse(cEmbedMsg, filter);
							userResponse.delete();
							pushMovie(userResponse, userResponse.content, true);
							userResponse.channel.send(`**${userResponse.content}** added to alist.`);
							cEmbedMsg.delete();
							break;
						}
						else {
							lEmbedMsg.delete();
							userResponse.channel.send('Sorry, I did not understand. Please try again.');
						}
					}
				}
				else {
					mEmbedMsg.delete();
					userResponse.channel.send('Sorry, I did not understand. Please try again.');
				}
			}
			else {
				// Response when user is not eligible
				message.reply('I am sorry but only active A-Listers can add to the A-List.');
			}
		}

		asyncCalls();
	},
};