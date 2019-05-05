import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import Bookshelf from 'bookshelf';
import uuid from 'uuid/v4';
import readLastLines from 'read-last-lines';
import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';

const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

// event parser tests
const TEST_CONNECTED = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\sis connected\s\(id=.+\))/i;
const TEST_DISCONNECTED = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\(id=.+\)\shas\sbeen\sdisconnected)/i;
const TEST_CHAT = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s\[)([0-9\.\s]+)(?:\]\s\[Chat\]\s)(.+)(?:\(.+\)\s)(.+)/i;
const TEST_DAMAGE_NPC = /(?:([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+" \(id=(.+) pos\=\<(.+)\>\)\[HP: ([0-9\.]+)\] hit by (?!player)(.+) (into.+) for ([0-9.]+) damage \((.+)\))/i;
const TEST_DAMAGE_PLAYER = /([0-9]{2}:[0-9]{2}:[0-9]{2}) \| Player ".+"(?: \(dead\))? \(id=(.+) pos\=\<(.+)\>\)\[HP: ([0-9\.]+)\] hit by Player ".+" \(id=(.+) pos\=\<(.+)\>\) (.+) for (.+) damage (.+ with [\w\s]+(?=from (.+) meters)|.+)/i;
const TEST_KILLED_BY_NPC = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\))\skilled\sby\s(?!player)(.+)/i;
const TEST_KILLED_BY_PLAYER = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos\=)(\<.+\>)(?:\)\skilled\sby\sPlayer\s")(.+)(?:".+\(.+pos=(<.+>)\)\s)(.+)/i;
const TEST_SUICIDE = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s(?:"|'))(.+)(?:(?:"|')\s\(id=.+\)\scommitted\ssuicide)/i;
const TEST_BLED_OUT = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\)\sbled\sout)/i;
const TEST_DIED_GENERIC = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos=\<.+\>\)\sdied\.\sStats>\sWater:\s)([0-9\.]+)(?:\sEnergy:\s)([0-9\.]+)(?:\sBleed(?:ing)?\ssources:\s)([0-9]+)/i;
const TEST_CONSCIOUSNESS = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos=)(\<.+\>)(?:\)\s)(is unconscious|regained consciousness)/i;
const TEST_FALL_DAMAGE = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\)\[HP:\s(.+)\]\s)(.+)/i;

/**
 * DayZ manager
 */
class DayZParser {
    loaded = false;
    // will keep track of the last line of the file since last update cycle
    lastLineIndex = 0;
    // keeps track of all unparsed lines
    unparsedLines = [];

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
        await this.tailLogFile();
    }

    /**
     * Reads the log file, and trails it for any changes
     * @return {Promise}
     */
    tailLogFile = async () => {
        const dirExists = fs.existsSync(this.server.config.logFileDirectory);

        if (!dirExists) {
            this.server.logger(this.name, 'The directory you specified in your settings is unreadable.');
            return;
        }

        this.watcher = chokidar.watch(this.server.config.logFileDirectory + '/*.ADM');
        this.watcher
            .on('add', (filePath, stats) => {
                const filePieces = filePath.split(path.sep);
                const file = filePieces[filePieces.length - 1];

                if (file === 'DayZServer_x64.ADM') {
                    if (this.loaded) {
                        this.server.logger(this.name, 'Server restart detected.');
                        this.server.discord.sendSystemMessage('Server restart detected.');
                    }
                    return;
                }

                this.import(file);
            });
            /*.on('change', (event, filePath) => {
                const filePath = filePath.split(filePath.sep);
                const file = filePath[filePath.length - 1];

                if (file !== 'DayZServer_x64.ADM') {
                    return;
                }
            });*/

        this.server.logger(this.name, `Watching .ADM files in the "${this.server.config.logFileDirectory}" directory for changes.`);
        setTimeout(() => this.loaded = true, 2000);
    }

    async import(filename) {
        this.server.database.models.logs
            .where('file_name', filename)
            .fetch()
            .then(function(model) {
                if (model) {
                    return;
                }

                this.importLogFile()
            }).catch(function(err) {
                console.error(err);
            });
    }

    importLogFile(filename) {
        fs.readFile(`${this.server.config.logFileDirectory}/${filename}`, (err, data) => {
            if (err) {
                this.server.logger(this.name, `Unable to read file "${this.server.config.logFileDirectory}".`);
                return;
            }

            const lines = data.toString().split('\n');

            if (!lines.length <= 0) {
                return;
            }

            const t0 = performance.now();
            this.server.logger(this.name, `Importing "${filename}"..`);

            Bookshelf.transaction(function(t) {
                return this.server.database.models.logs
                    .create({
                        file_name: filename,
                    })
                    .save(null, {transacting: t})
                    .tap((model) => {
                        const parsedLines = lines.map(() => this.getLineEvent(line));
                        const linesToImport = parsedLines.filter((line) => line);

                        return Promise.map([
                                {title: 'Canterbury Tales'},
                                {title: 'Moby Dick'},
                                {title: 'Hamlet'}
                          ], function(info) {
                                // Some validation could take place here.
                                return new Book(info).save({'shelf_id': model.id}, {transacting: t});
                          });

                        const lineImports = lines.map(() => this.parseLine(line));
                        await Promise.all(lineImports);
                    });
            });

            const t1 = performance.now();

            this.server.logger(this.name, `Import of "${filename}" complete! Took ${(t1 - t0)/1000} seconds.`);
            (t1 - t0)
        });
    }

    getLineEvent(line) {
        const parsedLine = this.parseLine(line);
        const categoriesToLog = this.server.config.logEventsCategories;
        const typesToLog = this.server.config.logEventsTypes;

        if (!line) {
            return null;
        }

        // if specific event categories are specified
        // we only want to log events matching them.
        if (categoriesToLog.length) {
            if (!categoriesToLog.includes(event.category)) {
                return null;
            }
        }

        // if specific event types are specified
        // we only want to log events matching them.
        if (typesToLog.length) {
            if (!event.type || !typesToLog.includes(event.type)) {
                return null;
            }
        }
    }

    /**
     * Parses a log line entry
     * @param  {String} string A line in the log file
     * @return {Promise}       resolves to an object
     */
    parseLine(string) {
        /*const wasChatMessage = string.match(TEST_CHAT);

        if (wasChatMessage) {
            return {
                category: 'chat',
                timestamp: wasChatMessage[1],
                datestamp: wasChatMessage[2],
                player: wasChatMessage[3],
                message: wasChatMessage[4],
            };
        }*/

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

        const wasDamagedByPlayer = string.match(TEST_DAMAGE_PLAYER);

        if (wasDamagedByPlayer) {
            return {
                table: 'damage',
                data: {
                    timestamp: wasDamagedByNPC[1],
                    player_bisid: wasDamagedByNPC[2],
                    player_pos: wasDamagedByNPC[3],
                    player_hp: wasDamagedByNPC[4],
                    attacker_bisid: wasDamagedByNPC[5],
                    attacker_pos: wasDamagedByNPC[5],
                    body_part: wasDamagedByNPC[6],
                    damage: wasDamagedByNPC[7],
                    weapon: wasDamagedByNPC[8],
                    distance: wasDamagedByNPC[8] || 0,
                },
            };
        }

        const waskilledByInfected = string.match(TEST_KILLED_BY_NPC);

        if (waskilledByInfected) {
            return {
                category: 'killed',
                type: 'pve',
                timestamp: waskilledByInfected[1],
                player: waskilledByInfected[2],
                killer: waskilledByInfected[3],
            };
        }

        const waskilledByPlayer = string.match(TEST_KILLED_BY_PLAYER);

        if (waskilledByPlayer) {
            return {
                category: 'killed',
                type: 'pvp',
                timestamp: waskilledByPlayer[1],
                player: waskilledByPlayer[2],
                playerPos: waskilledByPlayer[3],
                killer: waskilledByPlayer[4],
                killerPos: waskilledByPlayer[5],
                weapon: waskilledByPlayer[6],
            };
        }

        const wasKilledGeneric = string.match(TEST_DIED_GENERIC);

        if (wasKilledGeneric) {
            return {
                category: 'killed',
                type: 'unknown',
                timestamp: wasKilledGeneric[1],
                player: wasKilledGeneric[2],
                killer: 'Unknown',
                water: wasKilledGeneric[3],
                energy: wasKilledGeneric[4],
                bleeds: wasKilledGeneric[5],
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

        const wasSuicide = string.match(TEST_SUICIDE);

        if (wasSuicide) {
            return {
                category: 'killed',
                type: 'suicide',
                timestamp: wasSuicide[1],
                player: wasSuicide[2],
            };
        }

        const wasBledOut = string.match(TEST_BLED_OUT);

        if (wasBledOut) {
            return {
                category: 'killed',
                type: 'bleedout',
                timestamp: wasBledOut[1],
                player: wasBledOut[2],
                killer: 'Unknown',
            };
        }

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

        const wasDamagedByEnvironment = string.match(TEST_FALL_DAMAGE);

        if (wasDamagedByEnvironment) {
            return {
                category: 'damage',
                type: 'environment',
                timestamp: wasDamagedByEnvironment[1],
                player: wasDamagedByEnvironment[2],
                hp: wasDamagedByEnvironment[3],
                damage: wasDamagedByEnvironment[4],
            };
        }

        return null;
    }
}

export default DayZParser;
