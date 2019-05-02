import Discord from 'discord.js';
import {remote} from 'electron';

/**
 * DiscordBot manager
 */
class DiscordBot {
    connected = false;
    muted = false;

    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'Discord Bot';
        this.server = server;
        this.server.logger(this.name, 'Component instantiated');
    }

    /**
     * Load the component
     * @return {Promise}
     */
    load() {
        return new Promise((resolve) => {
            this.server.logger(this.name, 'Creating client..');
            const token = this.server.config.discordToken;

            if (!token || token === '') {
                this.server.logger(this.name, 'No token found, discord intergration disabled.');
                resolve();
                return;
            }

            // Create the bot
            this.client = new Discord.Client();

            // Console log the client user when its logged in
            this.client.on('ready', () => {
                this.connected = true;
                this.guild = this.client.guilds.get(this.server.config.discordServerID);
                this.channel = this.guild.channels.get(this.server.config.discordChannelID);

                this.client.user.setActivity(this.server.config.discordStatus || 'Cat & Mouse');

                this.server.logger(this.name, `Connected to server "${this.guild.name}"`);
                this.server.logger(this.name, `Target channel is "${this.channel.name}"`);
                this.sendSystemMessage(`v${remote.app.getVersion()} connected.`);
                resolve();
            });

            this.client.on('disconnect', () => {
                this.connected = false;
                this.server.logger(this.name, 'Disconnected from server.');
            });

            this.server.logger(this.name, 'Connecting..');

            // login to discord.
            this.client.login(this.server.config.discordToken);
        });
    }

    /**
     * Send message to channel on discord
     * @param  {String} message The message to send
     */
    sendMessage(message) {
        if (!this.connected || this.muted) {
            return;
        }

        this.channel
            .send(message.split('"').join('**'))
            .catch(console.error);
    }

    sendSystemMessage(message) {
        if (!this.server.config.postSystenEvents) {
            return;
        }

        this.channel
            .send(message, {code: true})
            .catch(console.error);
    }
}

export default DiscordBot;
