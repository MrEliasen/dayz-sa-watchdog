import fs from 'fs';
import uuid from 'uuid/v4';
import readLastLines from 'read-last-lines';

/**
 * DayZ manager
 */
class DayZParser {
    // will keep track of the last line of the file since last update cycle
    lastLineIndex = 0;
    // avoids duplicate update event triggers.
    isParsing = false;

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
    async tailLogFile() {
        const lines = this.getFileLines();
        this.lastLineIndex = lines.length - 1;

        // god damn windows and not having tail - there I fixed it
        this.watcher = fs.watch(this.server.config.logFilePath, null, (curr, prev) => {
            if (this.isParsing) {
                return;
            }

            this.isParsing = true;
            this.parseEntires();
        });

        this.server.logger(this.name, `Watching "${this.server.config.logFilePath}" for changes.`);
    }

    getFileLines() {
        const data = fs.readFileSync(this.server.config.logFilePath);
        return data.toString().split('\n');
    }

    parseEntires() {
        const lines = this.getFileLines();

        if (lines < this.lastLineIndex) {
            this.lastLineIndex = 0;
        }

        const unparsedLines = lines.slice(this.lastLineIndex + 1);

        if (unparsedLines.length) {
            unparsedLines.forEach((line, i) => {
                this.parseLine(line);
            });
        }

        this.lastLineIndex = lines.length - 1;
        this.isParsing = false;
    }

    /**
     * Parses a log line entry
     * @param  {String} string A line in the log file
     * @return {Promise}       resolves to an object
     */
    async parseLine(string) {
        const connectTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\sis connected\s\(id=.+\))/i;
        const disconnectTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\(id=.+\)\shas\sbeen\sdisconnected)/i;
        const chatTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Chat\(")(.+)(?:"\(id=.+\):\s)(.+)/i;
        const damageNPCTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos\=\<.+\>\)\[HP:\s)([0-9\.]+)(?:\]\shit\sby\s)(.+)(?:\s)(into.+)(?:\()(.+)(?:\))/i;
        const damagePlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos\=)(\<.+\>)(?:\)\[HP:\s)([0-9\.]+)(?:\]\shit\sby\sPlayer\s")(.+)(?:"\s\(id=.+\spos\=)(\<.+\>)(?:\)\s)(.+\sdamage)(?:\s)?(.+)?/i;
        const killedByInfectedTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\))\skilled\sby\s(.+)/i;
        const killedByPlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos\=)(\<.+\>)(?:\)\skilled\sby\s")(.+)(?:"\(id=.+\spos\=)(\<.+\>)(?:\)\s(.+))/i;
        const suicideTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\(id=.+\,.+\)\scommitted\ssuicide)/i;
        const bledOutTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\)\sbled\sout)/i;
        const diedGenericTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\spos=\<.+\>\)\sdied\.\sStats>\sWater:\s)([0-9\.]+)(?:\sEnergy:\s)([0-9\.]+)(?:\sBleed(?:ing)?\ssources:\s)([0-9]+)/i;

        const wasConneted = string.match(connectTest);

        if (wasConneted) {
            this.addEvent({
                category: 'connect',
                timestamp: wasConneted[1],
                player: wasConneted[2],
                id: uuid,
            });
            this.events = this.events.slice(0, 1000);
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
                player: wasChatMessage[2],
                message: wasChatMessage[3],
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
                playerPos: wasDamagedByPlayer[3],
                killer: waskilledByPlayer[4],
                killerPos: wasDamagedByPlayer[5],
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
                }
                break;

            case 'killed':
                switch (event.type) {
                    case 'pv':
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
