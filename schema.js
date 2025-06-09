import {text, integer, sqliteTable} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	nick: text().unique().notNull().primaryKey(),
	desc: text().notNull(),
	ref: text(),
	link: text(),
	counter: integer().default(0),
	bottle: integer({mode: 'boolean'}).default(true),
	counterEnabled: integer({mode: 'boolean'}).default(true),
	lastGreeted: integer({mode: 'timestamp_ms'}).default(0),
});

export const channels = sqliteTable('channels', {
	name: text().unique().notNull().primaryKey(),
	bottleEnabled: integer({mode: 'boolean'}).default(true),
	noticesEnabled: integer({mode: 'boolean'}).default(true),
	greetingsEnabled: integer({mode: 'boolean'}).default(true),
});
