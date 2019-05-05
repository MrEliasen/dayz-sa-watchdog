/**
 * Stats manager
 */
class Stats {
    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'Stats';
        this.server = server;
        this.server.logger(this.name, 'Component instantiated');
    }
}

export default Stats;
