const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
	name: 'add',
	description: 'Add Movies to the A-List.',
	execute(message, args, db) {

		// Function returns the first movie in list
		async function getFirstMovie(list) {
			console.log('Called: getMovie()');
			let movie;
			await fetch(`http://www.omdbapi.com/?i=${list.Search[0].imdbID}&apikey=69ad87c1`)
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

		async function asyncCalls() {
			console.log('Called: asyncCalls()');
			const eligibility = await getEligibility();

			// Check user Eligibility before proceeding with async addMovie calls.
			if(eligibility) {
				const list = await getList();
				const movie = await getFirstMovie(list);

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
				message.delete();
				const mEmbedMsg = await message.channel.send(mEmbed);
				const filter = m => m.author.id === message.author.id;
				let userResponse = await awaitResponse(mEmbedMsg, filter);
				console.log('userResponse was returned: ' + userResponse);
				console.log('userResponse being checked: ' + userResponse.content.toUpperCase());

				if (userResponse.content.toUpperCase() == 'YES' || userResponse.content.toUpperCase() == 'Y') {
					mEmbedMsg.delete();
					userResponse.channel.send('TODO: Add to list');
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
							userResponse.channel.send('TODO: Add movie to list.');
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
							userResponse.channel.send(`**${userResponse.content}** added to alist.`);
							cEmbedMsg.delete();
							break;
						}
					}
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