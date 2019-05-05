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
                databasePassword
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
            this.server.logger(this.name, 'Importing tables (if required)..');
            await this.import();
            this.createModels();
        } catch (err) {
            console.log(err);
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
            client: databaseType,
        };

        if (databaseType !== 'sqlite3') {
            options.connection = {
                host : databaseHost,
                user : databaseUser,
                password : databasePassword,
                database : databaseName,
                multipleStatements: true,
            };

            if (databasePort !== '') {
                options.connection.port = databasePort
            }
        } else {
            const sqliteDbDist = remote.app.getPath('userData') + '/database.sqlite';
            const exits = fs.existsSync(sqliteDbDist);

            if (!exits) {
                // make sure the database file exists, otherwise, create it
                fs.copyFileSync(__dirname + './database.sqlite', sqliteDbDist);
            }

            options.connection = {
                filename: sqliteDbDist,
            };
            options.useNullAsDefault = true;
        }

        this.connection = knex(options);
        this.db = bookshelf(this.connection);
    }

    async import() {
        if (this.server.config.databaseType === 'sqlite3') {
            return;
        }

        const sql = fs.readFileSync(__dirname + '/tables.sql').toString();
        await this.connection.raw(sql.toString());
        return;
    }

    createModels() {
        this.models.players = this.db.Model.extend({
            tableName: 'players',
        });

        this.models.damage = this.db.Model.extend({
            tableName: 'damage',
        });

        this.models.killed = this.db.Model.extend({
            tableName: 'killed',
        });

        this.models.logs = this.db.Model.extend({
            tableName: 'imported_logs',
        });
    }
}

export default Database;
