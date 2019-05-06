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

----- [Public Commands] -----
${generalArray.join("\n")}

------- [DM Commands] -------
${whisperArray.join("\n")}
-----------------------------
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

    serverRankedStats(message) {
        this.server.database.connection
            .raw(`SELECT
                        player_name,
                        distance
                    FROM
                        damage
                    LEFT JOIN
                        players
                        ON players.player_bisid = damage.attacker_bisid
                    WHERE
                        damage.attacker_bisid != ''
                    GROUP BY
                        damage.attacker_bisid
                    ORDER BY
                        distance * 1 DESC
                    LIMIT 10`)
            .then((models) => {
                let maxDistance;

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
            })
            .catch((err) => {
                this.server.logger(this.name, err);
            });
    }


}

export default Stats;
