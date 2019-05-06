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
                desc: 'Show the top 10 list of most player kills (killing shot/hit).',
            },
            {
                cmd: '!top damage',
                desc: 'Show the top 10 list of most player damage done.',
            },
            {
                cmd: '!top kill distance',
                desc: 'Show the top 10 list of longest player kill-shot.',
            },
            {
                cmd: '!top damage distance',
                desc: 'Show the top 10 list of longest player damage-shot.',
            },
            {
                cmd: '!top suicides',
                desc: 'Show the top 10 list of players who killed themselves most times.',
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
        }
    }

    top10Suicides(message) {
        this.server.database.connection
            .raw(`SELECT
                        players.player_name,
                        COUNT(killed.player_bisid) as deaths
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.player_bisid
                    WHERE
                        killed.attacker_npc = 'suicide'
                    GROUP BY
                        killed.player_bisid
                    ORDER BY
                        deaths DESC
                    LIMIT 10`)
            .then((models) => {
                let maxDeaths;

                message.channel.send(templateTopList(
                    'Most Suicides',
                    models.map((p, index) => {
                        if (index === 0) {
                            maxDeaths = p.deaths.toString().length;
                        }

                        return `${p.deaths.toString().padStart(maxDeaths, ' ')} deaths | ${p.player_name||'-'}`;
                    })
                ));
            })
            .catch((err) => {
                this.server.logger(this.name, err);
            });
    }

    top10KillsPvP(message) {
        this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(killed.player_bisid) as kills
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.attacker_bisid
                    WHERE
                        killed.attacker_bisid != ''
                    GROUP BY
                        killed.attacker_bisid
                    ORDER BY
                        kills DESC
                    LIMIT 10`)
            .then((models) => {
                let maxKills;

                message.channel.send(templateTopList(
                    'Most Kills (PvP)',
                    models.map((p, index) => {
                        if (index === 0) {
                            maxKills = p.kills.toString().length;
                        }

                        return `${p.kills.toString().padStart(maxKills, ' ')} kills | ${p.player_name||'-'}`;
                    })
                ));
            })
            .catch((err) => {
                this.server.logger(this.name, err);
            });
    }

    top10DamagePvP(message) {
        this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(damage.damage) as totalDamage
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
                        totalDamage DESC
                    LIMIT 10`)
            .then((models) => {
                let maxDamage;

                message.channel.send(templateTopList(
                    'Most Damage Dealt (PvP)',
                    models.map((p, index) => {
                        if (index === 0) {
                            maxDamage = p.totalDamage.toString().length;
                        }

                        return `${p.totalDamage.toString().padStart(maxDamage, ' ')} Damage | ${p.player_name||'-'}`;
                    })
                ));
            })
            .catch((err) => {
                this.server.logger(this.name, err);
            });
    }

    top10KillsDistance(message) {
        this.server.database.connection
            .raw(`SELECT
                        player_name,
                        distance
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.attacker_bisid
                    WHERE
                        killed.attacker_bisid != ''
                    GROUP BY
                        killed.attacker_bisid
                    ORDER BY
                        distance * 1 DESC
                    LIMIT 10`)
            .then((models) => {
                let maxDistance;

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
            })
            .catch((err) => {
                console.log(err);
            });
    }

    top10DamageDistance(message) {
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
