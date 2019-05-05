import fs from 'fs';
import {remote} from 'electron';
import knex from 'knex';
import bookshelf from 'bookshelf';

// convert MySQL to SQLite
// https://www.rebasedata.com/convert-mysql-to-sqlite-online

/**
 * Database manager
 */
class Database {
    models = {};

    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'Database';
        this.server = server;
        this.server.logger(this.name, 'Component instantiated');
    }

    /**
     * Loads the component
     */
    async load() {
        try {
            const {
                collectStats,
                databaseType,
                databaseHost,
                databaseName,
                databaseUser,
                databasePassword,
            } = this.server.config;

            if (!collectStats) {
                this.server.logger(this.name, 'Database not required because stats collection is disabled.');
                return;
            }

            if (databaseType === '') {
                this.server.logger(this.name, 'Stats collection enabled, but no database option selected.');
                return;
            }

            if (databaseType !== 'sqlite3') {
                if (databaseHost === '' || databaseName === '' || databaseUser === '' || databasePassword === '') {
                    this.server.logger(this.name, 'Stats collection enabled, but database configuration is incomplete.');
                    return;
                }
            }

            this.server.logger(this.name, 'Connecting to database..');
            await this.connect();
            await this.import();
            this.createModels();
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async connect() {
        const {
            databaseType,
            databaseHost,
            databaseName,
            databaseUser,
            databasePassword,
            databasePort,
        } = this.server.config;

        const options = {
            debug: process.env.NODE_ENV === 'development',
            client: databaseType,
            acquireConnectionTimeout: 5000,
        };

        if (databaseType !== 'sqlite3') {
            options.connection = {
                host: databaseHost,
                user: databaseUser,
                password: databasePassword,
                database: databaseName,
                multipleStatements: true,
            };

            if (databasePort && databasePort !== '') {
                options.connection.port = databasePort;
            }
        } else {
            const sqliteDbDist = remote.app.getPath('userData') + '/database.sqlite';
            const exits = fs.existsSync(sqliteDbDist);

            if (!exits) {
                // make sure the database file exists, otherwise, create it
                fs.copyFileSync(__dirname + '/database.sqlite', sqliteDbDist);
            }

            options.connection = {
                filename: sqliteDbDist,
            };
            options.useNullAsDefault = true;
        }

        this.connection = knex(options);
        this.db = bookshelf(this.connection);
        return this.connection;
    }

    async import() {
        if (this.server.config.databaseType === 'sqlite3') {
            return;
        }

        try {
            this.server.logger(this.name, 'Importing tables (if required)..');
            const sql = fs.readFileSync(__dirname + '/tables.sql').toString();
            //await this.connection.raw(sql.toString());
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    createModels() {
        this.models.damage = this.db.Model.extend({
            tableName: 'damage',
            defaults: {
                player_hp: '',
                attacker_bisid: '',
                attacker_pos: '',
                attacker_npc: '',
                body_part: '',
                damage: 0.0,
                weapon: '',
                distance: 0,
            },
        });

        this.models.logs = this.db.Model.extend({
            tableName: 'logs',
        });

        this.models.killed = this.db.Model.extend({
            tableName: 'killed',
            defaults: {
                player_pos: '',
                attacker_bisid: '',
                attacker_pos: '',
                attacker_npc: '',
                weapon: '',
                distance: 0,
            },
        });

        this.models.players = this.db.Model.extend({
            tableName: 'players',
            idAttribute: 'player_bisid',
            defaults: {
                discord_id: '',
            },
        });

        this.models.linkTokens = this.db.Model.extend({
            tableName: 'link_tokens',
            idAttribute: 'discord_id',
        });
    }
}

export default Database;
