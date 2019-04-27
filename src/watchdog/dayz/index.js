import fs from 'fs';
import uuid from 'uuid/v4';

/**
 * DayZ manager
 */
class DayZParser {
    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.name = 'DayZ Parser';
        this.server = server;
        this.server.logger(this.name,`Component instantiated`);
    }

    /**
     * Loads the component
     */
    async load() {
        this.tailLogFile();
    }

    /**
     * Reads the log file, and trails it for any changes
     * @return {Promise}
     */
    tailLogFile() {
        // god damn windows and not having tail - there I fixed it
        this.watcher = fs.watch(this.server.config.logFilePath, (curr, prev) => {
            readLastLines
                .read(this.server.config.logFilePath, 1)
                .then((lines) => this.parseLine(lines.toString().trim()));
        });

        this.server.logger(this.name,`Watching "${this.server.config.logFilePath}" for changes.`);
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
        const damagePlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(id=.+\spos\=\<.+\>\)\[HP:\s)([0-9\.]+)(?:\]\shit\sby\sPlayer\s")(.+)(?:"\s\(id=.+\spos\=\<.+\>\)\s)(.+)(?:\s)(with.+)/i;
        const killedByInfectedTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\))\skilled\sby\s(.+)/i;
        const killedByPlayerTest = /([0-9]{2}:[0-9]{2}:[0-9]{2})(?:\s\|\s)(?:Player\s")(.+)(?:"\s\(DEAD\)\s\(id=.+\,.+\)\skilled\sby\s")(.+)(?:"\(.+\)\s(.+))/i;
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
                hp: wasDamagedByPlayer[3],
                attacker: wasDamagedByPlayer[4],
                damage: wasDamagedByPlayer[5],
                weapon: wasDamagedByPlayer[6],
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
                killer: waskilledByPlayer[3],
                weapon: waskilledByPlayer[4],
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
            case "connect":
                message = `"${event.player}" Connected`;
                break;

            case "disconnect":
                message = `"${event.player}" Disconnected`;
                break;

            case "damage":
                switch (event.type) {
                    case "pve":
                        message = `"${event.player}" (HP: ${event.hp}) was damaged ${event.damage} by NPC "${event.attacker}" with ${event.weapon}.`;
                        break;
                    case "pvp":
                        message = `"${event.player}" (HP: ${event.hp}) was damaged ${event.damage} by Player "${event.attacker}" ${event.weapon}.`;
                        break;
                }
                break;

            case "killed":
                switch (event.type) {
                    case "pve":
                        message = `"${event.player}" was killed by NPC "${event.killer}".`;
                        break;
                    case "pvp":
                        message = `"${event.player}" was killed by Player "${event.killer}" ${event.weapon}.`;
                        break;
                    case "suicide":
                        message = `"${event.player}" committed suicide.`;
                        break;
                    case "bleedout":
                        message = `"${event.player}" bled out.`;
                        break;
                    case "unknown":
                        message = `"${event.player}" died from unknown causes.`;
                        break;
                }
                break;

            case "chat":
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