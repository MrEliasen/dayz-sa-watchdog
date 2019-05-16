import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import uuid from 'uuid/v4';
import readLastLines from 'read-last-lines';
import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';
import {round2Decimal} from '../../helper';

const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

// event parser tests
const TEST_LINK_TOKEN = /^link ([a-z0-9]+)$/i;
const TEST_CONNECTED = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" is connected \(id=(.+)\)/i;
const TEST_DISCONNECTED = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+"\(id=(.+)\) has been disconnected/i;
const TEST_GLOBAL_CHAT = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| \[.+\] \[Chat\] (.+)\(steamid=(.+), bisid=([\w\+\=\/]{44})\) (.+)/i;
const TEST_DIRECT_CHAT = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| (?:Chat\("(.+)"\(id=(.+)\)\):) (.+)/i;
const TEST_DAMAGE_NPC = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(id=(.+) pos\=\<(.+)\>\)\[HP: ([0-9\.]+)\] hit by ((?!player).+) (?:into (.+)\([0-9]+\)) for ([0-9.]+) damage \((.+)\)/i;
const TEST_DAMAGE_PLAYER = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+"(?: \(dead\))? \(id=(.+) pos=\<(.+)\>\)\[HP: (.+)\] hit by Player ".+" \(id=(.+) pos=\<(.+)\>\) (?:into )?(.+)\([0-9]+\) for (.+) damage(?: \((MeleeFist)\)|(?: \(.+\))? with (.+(?=from (.+) meters)|.+))/i;
const TEST_KILLED_BY_NPC = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(DEAD\) \(id=(.+) pos=\<(.+)\>\) killed by (?!player)(.+)/i;
const TEST_KILLED_BY_PLAYER = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(DEAD\) \(id=(.+) pos\=\<(.+)\>\) killed by Player ".+" \(id=(.+) pos=\<(.+)\>\) with (.+) from (.+) meters/i;
const TEST_SUICIDE = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player (?:"|').+(?:"|') \(id=(.+)\) committed suicide\./i;
const TEST_BLED_OUT = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" (?:\(DEAD\) )?\(id=(.+)\) bled out/i;
const TEST_DIED_GENERIC = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(DEAD\) \(id=(.+) pos=\<(.+)\>\) died\. Stats> Water: (.+) Energy: (.+) Bleed sources: (.+)/i;
const TEST_CONSCIOUSNESS = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(id=(.+) pos=\<(.+)\>\) (is unconscious|regained consciousness)/i;
const TEST_FALL_DAMAGE = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(id=(.+) pos=<(.+)>\)\[HP: (.+)\] hit by FallDamage/i;

/**
 * DayZ manager
 */
class DayZParser {
    watchers = [];
    loaded = false;
    // keeps track of all unimported logs
    unImportedLogs = [];
    unimportedLogsTotal = 0;

    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'DayZ Parser';
        this.server = server;
        this.server.logger(this.name, 'Component instantiated');
    }

    /**
     * Loads the component
     */
    async load() {
        await this.tailLogFiles();
    }

    /**
     * Reads the log file, and trails it for any changes
     * @return {Promise}
     */
    tailLogFiles = async () => {
        this.importTimer = null;

        this.server.config.logFileDirectories.forEach((dir, index) => {
            try {
                const dirExists = fs.existsSync(dir);

                if (!dirExists) {
                    this.server.logger(this.name, `The directory "${dir}" is unreadable.`);
                    return;
                }

                const watcher = chokidar.watch(dir);
                watcher
                    .on('add', (filePath, stats) => {
                        const filePieces = filePath.split(path.sep);
                        const file = filePieces[filePieces.length - 1];
                        const ext = path.extname(file);

                        if (ext !== '.ADM') {
                            watcher.unwatch(filePath);
                            return;
                        }

                        if (file === 'DayZServer_x64.ADM') {
                            if (this.loaded) {
                                this.server.logger(this.name, 'Server restart detected.');
                            }
                            return;
                        }

                        this.import(dir, file);

                        if (this.importTimer !== null) {
                            try {
                                clearTimeout(this.importTimer);
                            } catch (err) {
                                // dont care
                            }
                        }

                        this.importTimer = setTimeout(() => {
                            this.importTimer = null;
                            this.recursiveWaitImport();
                        }, 1000);
                    });

                this.watchers.push(watcher);
                this.server.logger(this.name, `Tracking .ADM files in the "${dir}" directory.`);
            } catch (err) {
                console.log(err);
            }
        });

        // bit of a hack i know..
        setTimeout(() => {
            this.loaded = true;
        }, 2000);
    }

    async import(dir, filename) {
        this.server.database.models.logs
            .where('file_name', filename)
            .fetch()
            .then((model) => {
                if (model) {
                    return;
                }

                this.unImportedLogs.push({dir, filename});
                this.unimportedLogsTotal++;
            }).catch((err) => {
                console.error(err);
            });
    }

    recursiveWaitImport = async () => {
        if (this.unImportedLogs.length <= 0) {
            if (this.unimportedLogsTotal === 0) {
                return;
            }

            this.unimportedLogsTotal = 0;
            this.server.logger(this.name, 'Import Complete!');
            return;
        }

        const file = this.unImportedLogs.shift();
        await this.importLogFile(file);
        setTimeout(this.recursiveWaitImport, 150);
    }

    importLogFile(file) {
        const filename = file.filename;
        const dir = file.dir;

        return new Promise((resolve, reject) => {
            const fullFilePath = `${dir}/${filename}`;
            const linkRequests = [];
            const logsLeft = this.unimportedLogsTotal - this.unImportedLogs.length;

            fs.readFile(fullFilePath, (err, data) => {
                if (err) {
                    this.server.logger(this.name, `Unable to read file "${fullFilePath}".`);
                    resolve();
                    return;
                }

                const lines = data.toString().split('\n');

                this.server.logger(this.name, `${logsLeft}/${this.unimportedLogsTotal} | Importing ${lines.length} lines from "${dir}/${filename}"..`);
                if (lines.length <= 0) {
                    resolve();
                    return;
                }

                const t0 = performance.now();

                this.server.database.db
                    .transaction((t) => {
                        const models = this.server.database.models;
                        const modelLogFile = models.logs.forge({
                            file_name: filename,
                        });

                        return modelLogFile
                            .save(null, {transacting: t})
                            .tap((model) => {
                                const parsedLines = lines.map((line) => this.parseLine(line));
                                const entries = parsedLines.filter((line) => line);

                                return Promise.all(entries.map((entry) => {
                                    let params = {'logfile_id': model.id};

                                    if (entry.table === 'players') {
                                        params = null;
                                        entry.linkToken = entry.message.match(TEST_LINK_TOKEN);

                                        if (entry.linkToken) {
                                            linkRequests.push(entry);
                                        }
                                    }

                                    return models[entry.table]
                                        .forge(entry.data)
                                        .save(params, {transacting: t, method: 'insert'})
                                        .catch((err) => {
                                            // "there i fixed it" - ignore duplicate keys for players
                                            if (entry.table === 'players') {
                                                return models[entry.table]
                                                    .where('player_bisid', entry.data.player_bisid)
                                                    .fetch({require: true, transacting: t})
                                                    .then((currentPlayer) => {
                                                        currentPlayer
                                                            .set('player_name', entry.player_name);

                                                        if (entry.data.player_steamid !== '') {
                                                            currentPlayer
                                                                .set('player_steamid', entry.data.player_steamid);
                                                        }

                                                        currentPlayer
                                                            .set('player_name', entry.player_name);

                                                        return currentPlayer
                                                            .save(null, {transacting: t})
                                                            .catch((err) => {
                                                                console.log(err);
                                                                this.server.logger(this.name, 'Failed to update player data' + JSON.stringify(err));
                                                                this.unImportedLogs = [];
                                                            });
                                                    });
                                            }

                                            throw err;
                                        });
                                }));
                            });
                    })
                    .then(async () => {
                        const requests = linkRequests.map((player) => this.linkAccounts(player));
                        await Promise.all(requests);

                        const t1 = performance.now();
                        this.server.logger(this.name, `Log imported! Took ~${round2Decimal((t1 - t0)/1000)} seconds.`);
                        resolve();
                    })
                    .catch(function(err) {
                        console.error(err);
                        resolve();
                    });
            });
        });
    }

    async linkAccounts(player) {
        return this.server.database.models.linkTokens
            .where('token', player.linkToken[1])
            .fetch()
            .then((tokenModel) => {
                if (!tokenModel) {
                    return;
                }

                return this.server.database.models.players
                    .where('player_bisid', player.data.player_bisid)
                    .fetch()
                    .then((playerModel) => {
                        if (!playerModel) {
                            return;
                        }

                        return playerModel
                            .set('discord_id', tokenModel.get('discord_id'))
                            .save()
                            .then(() => {
                                return this.server.database.models.linkTokens
                                    .where('token', player.linkToken[1])
                                    .destroy()
                                    .catch((err) => {
                                        console.error(err);
                                    });
                            })
                            .catch((err) => {
                                console.error(err);
                            });
                    }).catch((err) => {
                        console.error(err);
                    });
            }).catch((err) => {
                console.error(err);
            });
    }

    /**
     * Parses a log line entry
     * @param  {String} string A line in the log file
     * @return {Promise}       resolves to an object
     */
    parseLine(string) {
        try {
            const wasDamagedByPlayer = string.match(TEST_DAMAGE_PLAYER);

            if (wasDamagedByPlayer) {
                return {
                    table: 'damage',
                    data: {
                        timestamp: wasDamagedByPlayer[1],
                        player_bisid: wasDamagedByPlayer[2],
                        player_pos: wasDamagedByPlayer[3],
                        player_hp: wasDamagedByPlayer[4],
                        attacker_bisid: wasDamagedByPlayer[5],
                        attacker_pos: wasDamagedByPlayer[6],
                        body_part: wasDamagedByPlayer[7],
                        damage: wasDamagedByPlayer[8],
                        weapon: wasDamagedByPlayer[9] || wasDamagedByPlayer[10],
                        distance: wasDamagedByPlayer[9] ? wasDamagedByPlayer[10] : wasDamagedByPlayer[11] || 0,
                    },
                };
            }

            const wasDamagedByNPC = string.match(TEST_DAMAGE_NPC);

            if (wasDamagedByNPC) {
                return {
                    table: 'damage',
                    data: {
                        timestamp: wasDamagedByNPC[1],
                        player_bisid: wasDamagedByNPC[2],
                        player_pos: wasDamagedByNPC[3],
                        player_hp: wasDamagedByNPC[4],
                        attacker_npc: wasDamagedByNPC[5],
                        body_part: wasDamagedByNPC[6],
                        damage: wasDamagedByNPC[7],
                        weapon: wasDamagedByNPC[8],
                    },
                };
            }

            const wasDamagedByEnvironment = string.match(TEST_FALL_DAMAGE);

            if (wasDamagedByEnvironment) {
                return {
                    table: 'damage',
                    data: {
                        timestamp: wasDamagedByEnvironment[1],
                        player_bisid: wasDamagedByEnvironment[2],
                        player_pos: wasDamagedByEnvironment[3],
                        player_hp: wasDamagedByEnvironment[4],
                        attacker_npc: 'falldamage',
                    },
                };
            }

            const waskilledByInfected = string.match(TEST_KILLED_BY_NPC);

            if (waskilledByInfected) {
                return {
                    table: 'killed',
                    data: {
                        timestamp: waskilledByInfected[1],
                        player_bisid: waskilledByInfected[2],
                        player_pos: waskilledByInfected[3],
                        attacker_npc: waskilledByInfected[5],
                    },
                };
            }

            const waskilledByPlayer = string.match(TEST_KILLED_BY_PLAYER);

            if (waskilledByPlayer) {
                return {
                    table: 'killed',
                    data: {
                        timestamp: waskilledByPlayer[1],
                        player_bisid: waskilledByPlayer[2],
                        player_pos: waskilledByPlayer[3],
                        attacker_bisid: waskilledByPlayer[4],
                        attacker_pos: waskilledByPlayer[5],
                        weapon: waskilledByPlayer[6],
                        distance: waskilledByPlayer[7],
                    },
                };
            }

            const wasKilledGeneric = string.match(TEST_DIED_GENERIC);

            if (wasKilledGeneric) {
                return {
                    table: 'killed',
                    data: {
                        timestamp: wasKilledGeneric[1],
                        player_bisid: wasKilledGeneric[2],
                        player_pos: wasKilledGeneric[3],
                        attacker_npc: 'Unknown',
                    },
                };
            }

            const wasSuicide = string.match(TEST_SUICIDE);

            if (wasSuicide) {
                return {
                    table: 'killed',
                    data: {
                        timestamp: wasSuicide[1],
                        player_bisid: wasSuicide[2],
                        attacker_npc: 'suicide',
                    },
                };
            }

            const wasBledOut = string.match(TEST_BLED_OUT);

            if (wasBledOut) {
                return {
                    table: 'killed',
                    data: {
                        timestamp: wasBledOut[1],
                        player_bisid: wasBledOut[2],
                        attacker_npc: 'bleedout',
                    },
                };
            }

            const wasGlobalChatMessage = string.match(TEST_GLOBAL_CHAT);

            if (wasGlobalChatMessage) {
                return {
                    table: 'players',
                    data: {
                        player_name: wasGlobalChatMessage[2],
                        player_steamid: wasGlobalChatMessage[3],
                        player_bisid: wasGlobalChatMessage[4],
                    },
                    message: wasGlobalChatMessage[5],
                };
            }

            const wasDirectChatMessage = string.match(TEST_DIRECT_CHAT);

            if (wasDirectChatMessage) {
                return {
                    table: 'players',
                    data: {
                        player_name: wasDirectChatMessage[2],
                        player_steamid: '',
                        player_bisid: wasDirectChatMessage[3],
                    },
                    message: wasDirectChatMessage[4],
                };
            }

            /*const consciousnessChanged = string.match(TEST_CONSCIOUSNESS);

            if (consciousnessChanged) {
                return {
                    category: 'status',
                    type: 'consciousness',
                    timestamp: consciousnessChanged[1],
                    player: consciousnessChanged[2],
                    playerPos: consciousnessChanged[3],
                    status: consciousnessChanged[4],
                };
            }*/

            /*const wasConneted = string.match(TEST_CONNECTED);

            if (wasConneted) {
                return {
                    category: 'connect',
                    timestamp: wasConneted[1],
                    player: wasConneted[2],
                    id: uuid,
                };
            }

            const wasDisconneted = string.match(TEST_DISCONNECTED);

            if (wasDisconneted) {
                return {
                    category: 'disconnect',
                    timestamp: wasDisconneted[1],
                    player: wasDisconneted[2],
                };
            }*/

            return null;
        } catch (err) {
            console.log(err);
        }
    }
}

export default DayZParser;
