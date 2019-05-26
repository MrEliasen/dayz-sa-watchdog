import fs from 'fs';
import path from 'path';
import Discord from 'discord.js';
import {remote, ipcRenderer} from 'electron';
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
                resolve();
            });

            this.client.on('disconnect', (err) => {
                this.connected = false;
                this.server.logger(this.name, err.code === 1000 ? 'Disconnected from server.' : err.reason);
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
            ipcRenderer.send('connect', {
                discordToken: this.server.config.discordToken,
            });
        });
    }

    async handleDMs(message) {
        try {
            const command = message.content.split(' ')[0];

            switch (command.toLowerCase()) {
                case '!status':
                    this.linkStatus(message);
                    return;
                case '!link':
                    this.createLink(message);
                    return;
                case '!unlink':
                    this.removeLink(message);
                    return;
                case '!logs':
                    this.getLogs(message);
                    return;
                case '!reset':
                    this.resetStats(message);
                    return;
                default:
                    this.server.stats.handleMessages(message);
                    return;
            }
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async resetStats(message) {
        try {
            const {resetRole, logFileDirectories} = this.server.config;
            const member = await this.guild.fetchMember(message.author);
            const hasRole = member.roles.get(resetRole);

            if (!hasRole) {
                return;
            }

            message.channel
                .send("Are you sure you wish to reset all player stats?.\nReact with a :thumbsup: **within 10 seconds** to confirm.")
                .then((confirmMessage) => {
                    confirmMessage.awaitReactions((reaction, user) => user.id === message.author.id, {time: 5000})
                        .then(async (collected) => {
                            const reaction = collected.first();

                            if (!reaction) {
                                message.channel.send('Confirmation not received.');
                                return;
                            }

                            if (reaction.emoji.identifier !== '%F0%9F%91%8D') {
                                message.channel.send('Confirmation not received.');
                                return;
                            }

                            await this.server.database.connection.raw('DELETE FROM damage');
                            await this.server.database.connection.raw('DELETE FROM killed');
                            await this.server.database.connection.raw('DELETE FROM logs');

                            message.channel.send('Player stats wiped.');
                        })
                        .catch(console.error);
                });
        } catch (err) {
            console.log(err);
        }
    }

    async getLogs(message) {
        try {
            const {permissions, logFileDirectories} = this.server.config;
            const member = await this.guild.fetchMember(message.author);
            const hasRole = member.roles.get(permissions);
            const msg = message.content.split(' ');
            let dir = logFileDirectories[0];

            if (!hasRole) {
                return;
            }

            if (msg.length > 1) {
                const server = parseInt(msg[1].trim(), 10);

                if (!isNaN(server) && server >= 1 && (server - 1) < logFileDirectories.length) {
                    dir = logFileDirectories[(server - 1)];
                }
            }

            const indicators = [
                {
                    string: ':zero:',
                    identifier: '0%E2%83%A3',
                },
                {
                    string: ':one:',
                    identifier: '1%E2%83%A3',
                },
                {
                    string: ':two:',
                    identifier: '2%E2%83%A3',
                },
                {
                    string: ':three:',
                    identifier: '3%E2%83%A3',
                },
                {
                    string: ':four:',
                    identifier: '4%E2%83%A3',
                },
                {
                    string: ':five:',
                    identifier: '5%E2%83%A3',
                },
                {
                    string: ':six:',
                    identifier: '6%E2%83%A3',
                },
                {
                    string: ':seven:',
                    identifier: '7%E2%83%A3',
                },
                {
                    string: ':eight:',
                    identifier: '8%E2%83%A3',
                },
                {
                    string: ':nine:',
                    identifier: '9%E2%83%A3',
                },
                {
                    string: ':keycap_ten:',
                    identifier: '%F0%9F%94%9F',
                },
            ];

            fs.readdir(dir, (err, files) => {
                if (err) {
                    console.log(err);
                    this.server.logger(this.name, 'ERROR: ' + JSON.stringify(err));
                    return;
                }

                const logFiles = files.filter((file) => path.extname(file) === '.ADM' && file !== 'DayZServer_x64.ADM');

                if (!logFiles.length) {
                    message.channel.send(`There are no log files for this server (${dir})`);
                    return;
                }

                const list = logFiles
                    .sort()
                    .reverse()
                    .slice(0, 10);

                const outputList = list.map((file, index) => {
                    const parts = file.replace('.ADM', '').split('_');
                    const stamp = {
                        year: parts[2],
                        month: parts[3],
                        day: parts[4],
                        time: {
                            hour: `${parts[5][0]}${parts[5][1]}`,
                            minute: `${parts[5][2]}${parts[5][3]}`,
                            second: `${parts[5][4]}${parts[5][5]}`,
                        },
                    };

                    return `${indicators[index].string} = ${stamp.year}/${stamp.month}/${stamp.day} @ ${stamp.time.hour}:${stamp.time.minute}`;
                });

                message.channel
                    .send(`Latest 10 log files in "${dir}"\nPlease react with the appropriate reaction to receive that log file.\nI will send you the file in **10 seconds**:\n\n${outputList.join("\n")}`)
                    .then((logsMessage) => {
                        logsMessage.awaitReactions((reaction, user) => user.id === message.author.id, {time: 10000})
                            .then((collected) => {
                                const reaction = collected.first();

                                if (!reaction) {
                                    message.channel.send('No reaction matching any of the files above was received.');
                                    return;
                                }

                                const index = indicators.findIndex((i) => i.identifier === reaction.emoji.identifier);
                                const filename = list[index];

                                if (!filename) {
                                    message.channel.send('No reaction matching any of the files above was received.');
                                    return;
                                }

                                ipcRenderer.send('sendFile', {
                                    filePath: `${dir}${path.sep}${filename}`,
                                    fileName: filename,
                                    userId: message.author.id,
                                });
                            })
                            .catch(console.error);
                    });
            });
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
                    return;
                }

                // fetch link token if it exists
                return models.linkTokens
                    .where('discord_id', message.author.id)
                    .fetch()
                    .then((tokenModel) => {
                        if (tokenModel) {
                            message.channel.send(`To link your Discord account to the UKR DayZ SA account, type this following sentence __exactly as it appears__, in the DayZ server chat ("direct" channel is recommended):\n\n\`link ${tokenModel.get('token')}\`\n\n__Your account will then be linked on next server restart__. You can check your status by typing \`!status\` to me.`);
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
                                message.channel.send(`To link your Discord account to the UKR DayZ SA account, type this following sentence __exactly as it appears__, in the DayZ server chat ("direct" channel is recommended):\n\n\`link ${token}\`\n\n__Your account will then be linked on next server restart__. You can check your status by typing \`!status\` to me.`);
                            })
                            .catch((err) => {
                                this.server.logger(this.name, err);
                            });
                    })
                    .catch((err) => {
                        this.server.logger(this.name, err);
                    });
            })
            .catch((err) => {
                this.server.logger(this.name, err);
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
                this.server.logger(this.name, err);
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
            .catch((err) => this.server.logger(this.name, err));
    }
}

export default DiscordBot;
