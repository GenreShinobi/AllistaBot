// Get the command
// Get a random Joke
// Wait 10 seconds
// Give the answer
// laugh!

const { default: fetch } = require("node-fetch");

module.exports = {
	name: 'joke',
	description: 'Tell us a Joke.',
	execute(message, args, db, bot) {

		// Function returns a random joke
		async function getRandomJoke()	{
			let joke;
			await fetch('https://official-joke-api.appspot.com/random_joke')
				.then(res => res.json())
				.then(data => {
					joke = data;
				});
			console.log(joke);
			return joke;
		}

		async function getJokeByType(key) {
			let joke;
			await fetch(`https://official-joke-api.appspot.com/jokes/${key}/random`)
				.then(res => res.json())
				.then(data => {
					joke = data;
				});
			console.log(joke);
			return joke;
		}

		async function asyncCalls() {
			let joke;
			if (args.length > 0) {
				joke = await getJokeByType(args);
			}
			else {
				joke = await getRandomJoke();
			}

			message.channel.send(joke.setup)
				.then(msg => {
					setTimeout(function() {
						msg.channel.send(`${joke.punchline} Haha!`);
					}, 10000);
				});
		}

		asyncCalls();
	},
};