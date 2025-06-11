# Axela

Axela is a public domain reimplementation of the [Alexa](https://github.com/ebjohnston/alexa) IRC greeting bot. It is designed to provide robust functionality and decent reliability while being easy to read and maintain.

## Need to fix

- Bottle spin settings don't change on nick change or profile delete
- Channel names are case sensitive
- Bottle spins and greetings can't be disabled in whole channels yet
- Fully consistent formatting (though lint passes)

## To run this code...

First, you need to set up an env file. An example is provided in `.env.example`. If you don't wish to verify TLS certs, set `TLS` to `noverify`. If you don't want TLS at all, simply remove the `TLS` option.

Next you'll have to create the SQL DB. To do this, do `npm run migrate`.

After that, you're done! You can now run the bot with `npm run start`.
