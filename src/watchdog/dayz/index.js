import fs from 'fs';
import uuid from 'uuid/v4';
import readLastLines from 'read-last-lines';
import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';

const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

/**
 * DayZ manager
 */
class DayZParser {
    // will keep track of the last line of the file since last update cycle
    lastLineIndex = 0;
    // avoids duplicate update event triggers.
    isReadingChanges = false;
    // will parse one event object at the time,
    // this will keep track of whether we are parsing one already
    // avoids mixing up the event ordet, hopefully.
    isParsing = false;
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
        this.parserTimer = setInterval(this.parseFileChanges, 3000);
    }

    /**
     * Reads the log file, and trails it for any changes
     * @return {Promise}
     */
    async tailLogFile() {
        const lines = this.getFileLines();
        this.lastLineIndex = lines.length - 1;

        // god damn windows and not having tail - there I fixed it
        this.watcher = fs.watch(this.server.config.logFilePath, null, (event, filename) => {
            if (this.isReadingChanges) {
                return;
            }

            this.isReadingChanges = true;

            // when the server creates a new log file, reset last line index
            if (event === 'rename') {
                this.server.logger(this.name, 'Server restart or file replacement detected. Resetting line counter.');
                this.server.discord.sendSystemMessage('Server restart/log file replacement detected.');
            }

            this.readFileChanges();
        });

        this.server.logger(this.name, `Watching "${this.server.config.logFilePath}" for changes.`);
    }

    getFileLines() {
        const data = fs.readFileSync(this.server.config.logFilePath);
        return data.toString().split('\n');
    }

    readFileChanges = () => {
        const lines = this.getFileLines();
        const unparsedLines = lines.slice(this.lastLineIndex + 1);

        if (unparsedLines.length) {
            this.unparsedLines.push(unparsedLines);
        }

        this.lastLineIndex = lines.length - 1;
        this.isReadingChanges = false;
    }

    parseFileChanges = () => {
        if (this.isParsing) {
            return;
        }

        if (!this.unparsedLines.length) {
            return;
        }

        this.isParsing = true;
        const eventList = this.unparsedLines.splice(0, 1);

        eventList[0].forEach((line) => {
            this.parseLine(line);
        });

        this.isParsing = false;
    }

    /**
     * Parses a log line entry
     * @param  {String} string A line in the log file
     * @return {Promise}       resolves to an object
     */
    parseLine(string) {
        const connectTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\sis connected\s\(id=.+\))/i;
        const disconnectTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\(id=.+\)\shas\sbeen\sdisconnected)/i;
        const chatTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s\[)([0-9\.\s]+)(?:\]\s\[Chat\]\s)(.+)(?:\(.+\)\s)(.+)/i;
        const damageNPCTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos\=\<.+\>\)\[HP:\s)([0-9\.]+)(?:\]\shit\sby\s(?!player))(.+)(?:\s)(into.+)(?:\()(.+)(?:\))/i;
        const damagePlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"(?:\s\(dead\))?\s\(id=.+\spos\=)(\<.+\>)(?:\)\[HP:\s)([0-9\.]+)(?:\]\shit\sby\sPlayer\s")(.+)(?:"\s\(id=.+\spos\=)(\<.+\>)(?:\)\s)(.+\sdamage)(?:\s)?(.+)?/i;
        const killedByInfectedTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\))\skilled\sby\s(?!player)(.+)/i;
        const killedByPlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos\=)(\<.+\>)(?:\)\skilled\sby\sPlayer\s")(.+)(?:".+\(.+pos=(<.+>)\)\s)(.+)/i;
        const suicideTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s(?:"|'))(.+)(?:(?:"|')\s\(id=.+\)\scommitted\ssuicide)/i;
        const bledOutTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\)\sbled\sout)/i;
        const diedGenericTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos=\<.+\>\)\sdied\.\sStats>\sWater:\s)([0-9\.]+)(?:\sEnergy:\s)([0-9\.]+)(?:\sBleed(?:ing)?\ssources:\s)([0-9]+)/i;
        const consciousnessTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos=)(\<.+\>)(?:\)\s)(is unconscious|regained consciousness)/i;
        const fallDamageTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\)\[HP:\s(.+)\]\s)(.+)/i;

        const wasConneted = string.match(connectTest);

        if (wasConneted) {
            this.addEvent({
                category: 'connect',
                timestamp: wasConneted[1],
                player: wasConneted[2],
                id: uuid,
            });
            return;
        }

        const wasDisconneted = string.match(disconnectTest);

        if (wasDisconneted) {
            this.addEvent({
                category: 'disconnect',
                timestamp: wasDisconneted[1],
                player: wasDisconneted[2],
            });
            return;
        }

        const wasChatMessage = string.match(chatTest);

        if (wasChatMessage) {
            this.addEvent({
                category: 'chat',
                timestamp: wasChatMessage[1],
                datestamp: wasChatMessage[2],
                player: wasChatMessage[3],
                message: wasChatMessage[4],
            });
            return;
        }

        const wasDamagedByPlayer = string.match(damagePlayerTest);

        if (wasDamagedByPlayer) {
            this.addEvent({
                category: 'damage',
                type: 'pvp',
                timestamp: wasDamagedByPlayer[1],
                player: wasDamagedByPlayer[2],
                playerPos: wasDamagedByPlayer[3],
                hp: wasDamagedByPlayer[4],
                attacker: wasDamagedByPlayer[5],
                attackerPos: wasDamagedByPlayer[6],
                damage: wasDamagedByPlayer[7],
                weapon: wasDamagedByPlayer[8] || '',
            });
            return;
        }

        const wasDamagedByNPC = string.match(damageNPCTest);

        if (wasDamagedByNPC) {
            this.addEvent({
                category: 'damage',
                type: 'pve',
                timestamp: wasDamagedByNPC[1],
                player: wasDamagedByNPC[2],
                hp: wasDamagedByNPC[3],
                attacker: wasDamagedByNPC[4],
                damage: wasDamagedByNPC[5],
                weapon: wasDamagedByNPC[6],
            });
            return;
        }

        const wasDamagedByEnvironment = string.match(fallDamageTest);

        if (wasDamagedByEnvironment) {
            this.addEvent({
                category: 'damage',
                type: 'environment',
                timestamp: wasDamagedByEnvironment[1],
                player: wasDamagedByEnvironment[2],
                hp: wasDamagedByEnvironment[3],
                damage: wasDamagedByEnvironment[4],
            });
            return;
        }

        const waskilledByInfected = string.match(killedByInfectedTest);

        if (waskilledByInfected) {
            this.addEvent({
                category: 'killed',
                type: 'pve',
                timestamp: waskilledByInfected[1],
                player: waskilledByInfected[2],
                killer: waskilledByInfected[3],
            });
            return;
        }

        const waskilledByPlayer = string.match(killedByPlayerTest);

        if (waskilledByPlayer) {
            this.addEvent({
                category: 'killed',
                type: 'pvp',
                timestamp: waskilledByPlayer[1],
                player: waskilledByPlayer[2],
                playerPos: waskilledByPlayer[3],
                killer: waskilledByPlayer[4],
                killerPos: waskilledByPlayer[5],
                weapon: waskilledByPlayer[6],
            });
            return;
        }

        const wasSuicide = string.match(suicideTest);

        if (wasSuicide) {
            this.addEvent({
                category: 'killed',
                type: 'suicide',
                timestamp: wasSuicide[1],
                player: wasSuicide[2],
            });
            return;
        }

        const wasBledOut = string.match(bledOutTest);

        if (wasBledOut) {
            this.addEvent({
                category: 'killed',
                type: 'bleedout',
                timestamp: wasBledOut[1],
                player: wasBledOut[2],
                killer: 'Unknown',
            });
            return;
        }

        const wasKilledGeneric = string.match(diedGenericTest);

        if (wasKilledGeneric) {
            this.addEvent({
                category: 'killed',
                type: 'unknown',
                timestamp: wasKilledGeneric[1],
                player: wasKilledGeneric[2],
                killer: 'Unknown',
                water: wasKilledGeneric[3],
                energy: wasKilledGeneric[4],
                bleeds: wasKilledGeneric[5],
            });
            return;
        }

        const consciousnessChanged = string.match(consciousnessTest);

        if (consciousnessChanged) {
            this.addEvent({
                category: 'status',
                type: 'consciousness',
                timestamp: consciousnessChanged[1],
                player: consciousnessChanged[2],
                playerPos: consciousnessChanged[3],
                status: consciousnessChanged[4],
            });
            return;
        }
    }

    /**
     * Prepends an event to the events list
     * @param {Object} event The event to prepend
     */
    addEvent(event) {
        const categoriesToLog = this.server.config.logEventsCategories;
        const typesToLog = this.server.config.logEventsTypes;

        // if specific event categories are specified
        // we only want to log events matching them.
        if (categoriesToLog.length) {
            if (!categoriesToLog.includes(event.category)) {
                return;
            }
        }

        // if specific event types are specified
        // we only want to log events matching them.
        if (typesToLog.length) {
            if (!event.type || !typesToLog.includes(event.type)) {
                return;
            }
        }

        // send message to discord
        const message = this.translateEvent(event);

        if (!message) {
            return;
        }

        this.server.discord.sendMessage(message);
    }

    /**
     * Translates an event object to a readable string
     * @param  {Object} event The event object
     * @return {String}
     */
    translateEvent(event) {
        let message;

        switch (event.category) {
            case 'connect':
                message = `"${event.player}" Connected`;
                break;

            case 'disconnect':
                message = `"${event.player}" Disconnected`;
                break;

            case 'damage':
                switch (event.type) {
                    case 'pve':
                        message = `"${event.player}" (HP: ${event.hp}) was damaged ${event.damage} by NPC "${event.attacker}" with ${event.weapon}.`;
                        break;
                    case 'pvp':
                        message = `"${event.player}" (Pos: ${event.playerPos}, HP: ${event.hp}) was damaged ${event.damage} by Player "${event.attacker}" (Pos: ${event.attackerPos}) ${event.weapon}.`;
                        break;
                    case 'environment':
                        message = `"${event.player}" (HP: ${event.hp}) ${event.damage}.`;
                        break;
                }
                break;

            case 'status':
                switch (event.type) {
                    case 'consciousness':
                        message = `"${event.player}" (Pos: ${event.playerPos}) ${event.status}.`;
                        break;
                }
                break;

            case 'killed':
                switch (event.type) {
                    case 'pve':
                        message = `"${event.player}" was killed by NPC "${event.killer}".`;
                        break;
                    case 'pvp':
                        message = `"${event.player}" (Pos: ${event.playerPos}) was killed by Player "${event.killer}" (Pos: ${event.killerPos}) ${event.weapon}.`;
                        break;
                    case 'suicide':
                        message = `"${event.player}" committed suicide.`;
                        break;
                    case 'bleedout':
                        message = `"${event.player}" bled out.`;
                        break;
                    case 'unknown':
                        message = `"${event.player}" died from unknown causes. Character stats time of death - Water: ${event.water}, Energy: ${event.energy} & Bleed Sources: ${event.bleeds}, `;
                        break;
                }
                break;

            case 'chat':
                message = `"${event.player}" said: ${DOMPurify.sanitize(event.message)}`;
                break;
        }

        if (!message) {
            return null;
        }

        return `[${event.timestamp}] ${message}`;
    }
}

export default DayZParser;
