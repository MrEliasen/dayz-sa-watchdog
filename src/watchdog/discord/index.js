import Discord from 'discord.js';
import {remote} from 'electron';
import Hashids from 'hashids';

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

            this.client.on('message', (message) => {
                const channelId = this.server.config.discordChannelID;

                if (message.channel.type === 'dm') {
                    this.handleDMs(message);
                    return;
                }

                if (!channelId || channelId === '') {
                    return;
                }

                if (message.channel.id !== channelId) {
                    return;
                }

                this.server.stats.handleMessages(message);
            });

            this.server.logger(this.name, 'Connecting..');

            // login to discord.
            this.client.login(this.server.config.discordToken);
        });
    }

    async handleDMs(message) {
        try {
            switch (message.content) {
                case '!status':
                    this.linkStatus(message);
                    return;
                case '!link':
                    this.createLink(message);
                    return;
                case '!unlink':
                    this.removeLink(message);
                    return;
                default:
                    this.server.stats.handleMessages(message);
                    return;
            }
        } catch (err) {
            console.log(err);
        }
    }

    linkStatus(message) {
        const models = this.server.database.models;

        return models.players
            .where('discord_id', message.author.id)
            .fetch()
            .then((playerModel) => {
                if (playerModel) {
                    message.channel.send(`Your Discord account is linked to the DayZ SA account "${playerModel.get('player_name')}". If you would like to unlink, type \`!unlink\`.`);
                } else {
                    message.channel.send('Your Discord account is not linked to any DayZ SA account. If you would like to link your account, type `!link` (without the quotes).');
                }

                return playerModel;
            });
    }

    createLink(message) {
        const models = this.server.database.models;

        return models.players
            .where('discord_id', message.author.id)
            .fetch()
            .then((playerModel) => {
                if (playerModel) {
                    message.channel.send(`Your Discord account is already linked to the DayZ SA account "${playerModel.get('player_name')}". If you would like to unlink, type \`!unlink\`.`);
                    return playerModel;
                }

                // fetch link token if it exists
                return models.linkTokens
                    .where('discord_id', message.author.id)
                    .fetch()
                    .then((tokenModel) => {
                        if (tokenModel) {
                            message.channel.send(`To link your Discord account to the UKR DayZ SA account, type this following sentence **exactly as it appears**, in the server\'s **direct** chat channel:\n\`link ${tokenModel.get('token')}\`\nYour account will then be linked on next server restart. You can check your status by typing \`!status\` to me.`);
                            return tokenModel;
                        }

                        const hash = new Hashids('' + message.author.id);
                        const token = hash.encode(message.createdTimestamp);

                        return models.linkTokens
                            .forge({
                                discord_id: message.author.id,
                                token: token,
                            })
                            .save(null, {method: 'insert'})
                            .then(() => {
                                message.channel.send(`To link your Discord account to the UKR DayZ SA account, type this following sentence **exactly as it appears**, in the server\'s **direct** chat channel:\n\`link ${token}\`\nYour account will then be linked on next server restart. You can check your status by typing \`!status\` to me.`);
                            })
                            .catch((err) => {
                                console.error(err);
                            });
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            })
            .catch((err) => {
                console.error(err);
            });
    }

    removeLink(message) {
        this.server.database.models.players
            .where('discord_id', message.author.id)
            .fetch()
            .then((model) => {
                if (!model) {
                    message.channel.send('Your Discord account is not linked to any DayZ SA account.');
                    return;
                }

                return model
                    .set({discord_id: ''})
                    .save()
                    .then(() => {
                        message.channel.send('Your Discord account is no longer linked to any DayZ SA account.');
                    });
            })
            .catch((err) => {
                console.error(err);
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
        /*if (!this.server.config.postSystenEvents) {
            return;
        }

        this.channel
            .send(message, {code: true})
            .catch(console.error);*/
    }
}

export default DiscordBot;
