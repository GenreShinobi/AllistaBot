const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
	name: 'add',
	description: 'Add Movies to the A-List.',
	execute(message, args, db) {

		async function getMovie(list) {
			console.log('Called: getMovie()');
			let movie;
			await fetch(`http://www.omdbapi.com/?i=${list.Search[0].imdbID}&apikey=69ad87c1`)
				.then(res => res.json())
				.then(data => {
					movie = data;
				});
			return movie;
		}

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

		async function asyncCalls() {
			console.log('Called: asyncCalls()');
			const eligibility = await getEligibility();
			if(eligibility) {
				const list = await getList();
				const movie = await getMovie(list);

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
				message.channel.send(mEmbed)
					.then(()=> {
						const filter = m => m.author.id === message.author.id;
						message.channel.awaitMessages(filter, {
							max: 1,
							time: 30000,
							errors: ['time'],
						})
							.then(message => {
								message = message.first();
								if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
									message.channel.send('Added.');
								}
								else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
									let titleArray = [];
									let dateArray = [];
									let imdbArray = [];

									let max = Object.keys(list.Search).length - 1;
									if (max > 10) { max = 10; }

									for (let i = 0; i < max; i++) {
										titleArray.push(`[${i + 1}] ${list.Search[i + 1].Title}`);
										dateArray.push(list.Search[i + 1].Year);
										imdbArray.push(`[Link](https://www.imdb.com/title/${list.Search[i + 1].imdbID})`);
									}
									console.log(dateArray);

									const lEmbed = new Discord.MessageEmbed()
										.setColor('#0099ff')
										.setAuthor('Any of these the correct movie?')
										.addFields(
											{ name: 'ID/Title', value: `${titleArray.join('\n')}`, inline: true },
											{ name: 'Date', value: `${dateArray.join('\n')}`, inline: true },
											{ name: 'IMDB', value: `${imdbArray.join('\n')}`, inline: true },
										);
									message.delete();
									message.channel.send(lEmbed);
								}
							});
					});
			}
			else {
				message.reply('I am sorry but only active A-Listers can add to the A-List.');
			}
		}

		asyncCalls();
	},
};