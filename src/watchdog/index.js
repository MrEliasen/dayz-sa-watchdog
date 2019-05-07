import EventEmitter from 'events';
import moment from 'moment';
import {remote} from 'electron';

// components
import DayZ from './dayz';
import Discord from './discord';
import Database from './database';
import Stats from './stats';

/**
 * Watchdog main class
 */
class Watchdog extends EventEmitter {
    constructor(config) {
        super(config);
        this.config = config;
    }

    /**
     * Boot up the server
     * @return {Promise}
     */
    async init() {
        this.logger('server', `${remote.app.getName()} v${remote.app.getVersion()}`);

        // application components for functionality
        this.database = new Database(this);
        this.discord = new Discord(this);
        this.dayz = new DayZ(this);
        this.stats = new Stats(this);

        await this.database.load();
        await this.discord.load();
        await this.dayz.load();

        this.logger('DayZ SA Watchdog', `v${remote.app.getVersion()} running.`);
    }

    async logger(component, msg) {
        const logMessage = (typeof msg !== 'string' ? JSON.stringify(msg) : msg);

        this.emit('console', {
            timestamp: moment().format('MM/DD hh:mm a'),
            component,
            msg: logMessage,
        });
    }

    async shutdown() {
        await this.logger(this.dayz.name, 'Stopping file watcher..');

        try {
            await this.dayz.watcher.close();
        } catch (err) {
            // we do not care..
        }

        try {
            clearTimeout(this.dayz.retryDirectoryTimer);
        } catch (err) {
            // we do not care..
        }

        await this.logger(this.discord.name, 'Disconnecting from discord..');

        try {
            await this.discord.client.destroy();
        } catch (err) {
            // we do not care..
        }
    }
}

export default Watchdog;
