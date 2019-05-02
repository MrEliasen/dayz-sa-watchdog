import EventEmitter from 'events';
import moment from 'moment';
import DayZ from './dayz';
import Discord from './discord';

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
        // application components for functionality
        this.discord = new Discord(this);
        this.dayz = new DayZ(this);

        await this.discord.load();
        await this.dayz.load();

        this.logger('server', 'Running!');
    }

    async logger(component, msg) {
        this.emit('console', {
            timestamp: moment().format('MM/DD hh:mm a'),
            component,
            msg,
        });
    }

    async shutdown() {
        await this.logger(this.dayz.name, 'Stopping file watcher..');
        await this.dayz.watcher.close();

        await this.logger(this.discord.name, 'Disconnecting from discord..');
        await this.discord.client.destroy();
    }
}

export default Watchdog;
