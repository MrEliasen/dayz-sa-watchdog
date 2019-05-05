import {round2Decimal} from '../../helper';

const templateTopList = (title, listArray) => `
\`\`\`css
${title}
-----------------------
${listArray.join("\n")}
-----------------------
"-" = Player name not confirmed.
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

    handleMessages(message) {
        switch (message.content.toLowerCase()) {
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
                    'Most Kills (PvP) (Top 10)',
                    models.map((p, index) => {
                        if (index === 0) {
                            maxKills = p.kills.toString().length;
                        }

                        return `${p.kills.toString().padStart(maxKills, ' ')} kills | ${p.player_name||'-'}`;
                    })
                ));
            })
            .catch((err) => {
                this.server.lgger(JSON.stringifyerr);
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
                    'Most Damage Dealt (PvP) (Top 10)',
                    models.map((p, index) => {
                        if (index === 0) {
                            maxDamage = p.totalDamage.toString().length;
                        }

                        return `${p.totalDamage.toString().padStart(maxDamage, ' ')} Damage | ${p.player_name||'-'}`;
                    })
                ));
            })
            .catch((err) => {
                this.server.lgger(JSON.stringifyerr);
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
                    'Longest Kill Shot (PvP) (Top 10)',
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
                    'Longest Damage Shot (PvP) (Top 10)',
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
                this.server.lgger(JSON.stringifyerr);
            });
    }
}

export default Stats;
