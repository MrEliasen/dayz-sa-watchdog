import Sqlstring from 'sqlstring';
import Queries from './queries';
import {round2Decimal} from '../../helper';

const templateTopList = (title, listArray) => `
\`\`\`css
${title}

---------- [TOP 10] ----------
${listArray.join("\n")}
------------------------------
"-" = Player name not confirmed.
\`\`\`
`;

const templateCommandList = (generalArray, whisperArray) => `
\`\`\`css
DayZ SA Watchdog - Commands

---------- [Public Commands] ----------
${generalArray.join("\n")}

------------ [DM Commands] ------------
${whisperArray.join("\n")}
---------------------------------------
\`\`\`
`;

const templateStats = (title, listArray) => `
\`\`\`css
${title}

---------- [Stats] ----------
${listArray.join("\n")}
------------------------------
\`\`\`
`;

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
        this.queries = new Queries(server);
        this.server.logger(this.name, 'Component instantiated');
    }

    commandList(message) {
        const whisperCommands = [
            {
                cmd: '!link',
                desc: 'Begin the process of linking your DayZ SA and Discord account.',
            },
            {
                cmd: '!unlink',
                desc: 'Immediately removes the account link.',
            },
            {
                cmd: '!status',
                desc: 'See the linking status of your account. Whether enabled or not.',
            },
            {
                cmd: '!stats',
                desc: 'See your DayZ account stats.',
            },
        ];

        const generalCommands = [
            {
                cmd: '!top kills',
                desc: 'Show the top 10 list of players with most kills (killing shot/hit).',
            },
            {
                cmd: '!top damage',
                desc: 'Show the top 10 list of players with most player damage done.',
            },
            {
                cmd: '!top kill distance',
                desc: 'Show the top 10 list of players with longest player kill-shot.',
            },
            {
                cmd: '!top damage distance',
                desc: 'Show the top 10 list of players with longest player damage-shot.',
            },
            {
                cmd: '!top suicides',
                desc: 'Show the top 10 list of players who killed themselves most times.',
            },
            {
                cmd: '!top spunge',
                desc: 'Show the top 10 list of players who have taken the most damage in PvP.',
            },
            {
                cmd: '!top weapons',
                desc: 'Show the top 10 list of most used weapons (by damage done).',
            },
            {
                cmd: '!top headshots',
                desc: 'Show the top 10 list of players with most headshots.',
            },
            {
                cmd: '!top deaths',
                desc: 'Show the top 10 list of players with most deaths.',
            },
        ];
        message.channel.send(templateCommandList(
            generalCommands.map((cmd) => `${cmd.cmd.padEnd(20, ' ')} | ${cmd.desc}`),
            whisperCommands.map((cmd) => `${cmd.cmd.padEnd(20, ' ')} | ${cmd.desc}`)
        ));
    }

    handleMessages(message) {
        switch (message.content.toLowerCase()) {
            case '!commands':
                return this.commandList(message);
            case '!stats':
                return this.playerStats(message);
            case '!top suicides':
                return this.top10Suicides(message);

            //PvP
            case '!top kills':
                return this.top10KillsPvP(message);
            case '!top damage':
                return this.top10DamagePvP(message);
            case '!top kill distance':
                return this.top10KillsDistance(message);
            case '!top damage distance':
                return this.top10DamageDistance(message);
            case '!top spunge':
                return this.top10DamageTakenPvP(message);
            case '!top weapons':
                return this.top10MostUsedWeapons(message);
            case '!top headshots':
                return this.top10MostHeadshots(message);
            case '!top deaths':
                return this.top10Deaths(message);
        }
    }

    async top10MostUsedWeapons(message) {
        try {
            let models = await this.queries.queryMostUsedWeapons(10);
            let maxDamage;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Used Weapons (by damage done)',
                models.map((p, index) => {
                    if (index === 0) {
                        maxDamage = p.total.toString().length;
                    }

                    return `${p.total.toString().padStart(maxDamage, ' ')} damage | ${p.weapon}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10Suicides(message) {
        try {
            let models = await this.queries.queryMostSuicides(10);
            let maxDeaths;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Suicides',
                models.map((p, index) => {
                    if (index === 0) {
                        maxDeaths = p.deaths.toString().length;
                    }

                    return `${p.deaths.toString().padStart(maxDeaths, ' ')} deaths | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10MostHeadshots(message) {
        try {
            let models = await this.queries.queryMostHeadShots(10);
            let maxHits;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Headshots',
                models.map((p, index) => {
                    if (index === 0) {
                        maxHits = p.hits.toString().length;
                    }

                    return `${p.hits.toString().padStart(maxHits, ' ')} headshots | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10KillsPvP(message) {
        try {
            let models = await this.queries.queryMostKills(10);
            let maxKills;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Kills',
                models.map((p, index) => {
                    if (index === 0) {
                        maxKills = p.kills.toString().length;
                    }

                    return `${p.kills.toString().padStart(maxKills, ' ')} kills | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10DamageTakenPvP(message) {
        try {
            let models = await this.queries.queryMostDamageTaken(10);
            let maxDamage;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Damage Taken (PvP)',
                models.map((p, index) => {
                    if (index === 0) {
                        maxDamage = p.totalDamage.toString().length;
                    }

                    return `${p.totalDamage.toString().padStart(maxDamage, ' ')} Damage | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10DamagePvP(message) {
        try {
            let models = await this.queries.queryMostDamageGiven(10);
            let maxDamage;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Damage Dealt (PvP)',
                models.map((p, index) => {
                    if (index === 0) {
                        maxDamage = p.totalDamage.toString().length;
                    }

                    return `${p.totalDamage.toString().padStart(maxDamage, ' ')} Damage | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10KillsDistance(message) {
        try {
            let models = await this.queries.queryMostKillsDistance(10);
            let maxDistance;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Longest Kill Shot (PvP)',
                models.map((p, index) => {
                    const roundedDistance = round2Decimal(parseInt(p.distance, 10)).toString();

                    if (index === 0) {
                        maxDistance = roundedDistance.length;
                    }

                    return `${roundedDistance.padStart(maxDistance, ' ')} meters | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10DamageDistance(message) {
        try {
            let models = await this.queries.queryMostDamageDistance(10);
            let maxDistance;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Longest Damage Shot (PvP)',
                models.map((p, index) => {
                    const roundedDistance = round2Decimal(parseInt(p.distance, 10)).toString();

                    if (index === 0) {
                        maxDistance = roundedDistance.length;
                    }

                    return `${roundedDistance.padStart(maxDistance, ' ')} meters | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async top10Deaths(message) {
        try {
            let models = await this.queries.queryMostDeaths(10);
            let maxDeaths;

            if (!models) {
                models = [];
            }

            message.channel.send(templateTopList(
                'Most Deaths (All Sources)',
                models.map((p, index) => {
                    if (index === 0) {
                        maxDeaths = p.deaths.toString().length;
                    }

                    return `${p.deaths.toString().padStart(maxDeaths, ' ')} deaths | ${p.player_name||'-'}`;
                })
            ));
        } catch (err) {
            this.server.logger(this.name, err);
        }
    }

    async playerStats(message) {
        try {
            const models = this.server.database.models;

            const playerModel = await models.players
                .where('discord_id', message.author.id)
                .fetch();

            if (!playerModel) {
                message.channel.send(`<@${message.author.id}> You have not yet linked your account. DM me with the message \`!link\``);
                return;
            }

            const bisid = playerModel.get('player_bisid');

            const weaponModel = await this.queries.queryMostUsedWeapons(1, bisid);
            const suicideModel = await this.queries.queryMostSuicides(1, bisid);
            const headshotModel = await this.queries.queryMostHeadShots(1, bisid);
            const killsModel = await this.queries.queryMostKills(1, bisid);
            const damageModel = await this.queries.queryMostDamageTaken(1, bisid);
            const damgeGivenModel = await this.queries.queryMostDamageGiven(1, bisid);
            const killDistanceModel = await this.queries.queryMostKillsDistance(1, bisid);
            const damageDistanceModel = await this.queries.queryMostDamageDistance(1, bisid);
            const deathModel = await this.queries.queryMostDeaths(1, bisid);

            const stats = [
                `[Kills]:               ${killsModel.length ? killsModel[0].kills : 0}`,
                `[Deaths]:              ${deathModel.length ? deathModel[0].deaths : 0}`,
                `[Headshots]:           ${headshotModel.length ? headshotModel[0].hits : 0}`,
                `[Longest kill shot]:   ${killDistanceModel.length ? round2Decimal(killDistanceModel[0].distance) : 0}`,
                `[Longest damage shot]: ${damageDistanceModel.length ? round2Decimal(damageDistanceModel[0].distance) : 0}`,
                `[Damage Taken]:        ${damageModel.length ? damageModel[0].totalDamage : 0}`,
                `[Damage Dealt]:        ${damgeGivenModel.length ? damgeGivenModel[0].totalDamage : 0}`,
                `[Most Used Weapon]:    ${weaponModel.length ? weaponModel[0].weapon : '-'}`,
                `[Suicides]:            ${suicideModel.length ? suicideModel[0].deaths : 0}`,
            ];

            const title = `DayZ SA Watchdog - Stats for "${message.author.username}"`;

            if (message.channel.type === 'dm') {
                message.channel.send(templateStats(title, stats));
                return;
            }

            message.channel.send(`<@${message.author.id}>${templateStats(title, stats)}`);
        } catch (err) {
            console.log(err);
            this.server.logger(this.name, err);
        }
    }
}

export default Stats;
