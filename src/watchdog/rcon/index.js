import Rcon from 'rcon';

/**
 * RCON manager
 */
class RCon {
    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'RCON';
        this.server = server;
        this.server.logger(this.name, 'Component instantiated');
    }

    async load() {
        try {
            const options = {
                tcp: false,
                challenge: true,
            };
            this.client = new Rcon('localhost', 2302, 'lol', options);

            this.client
                .on('connect', () => {
                    console.log('Connected');
                })
                .on('auth', () => {
                    console.log('Authed!');
                })
                .on('response', (str) => {
                    console.log('Got response: ', str);
                })
                .on('error', (err) => {
                    console.log('Error: ', err);
                })
                .on('end', () => {
                    console.log('Socket closed!');
                });

            this.client.connect();
        } catch (err) {
            console.log(err);
        }
    }
}

export default RCon;
