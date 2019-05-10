import Sqlstring from 'sqlstring';

/**
 * Queries manager
 */
class Queries {
    /**
     * class constructor
     * @param  {Server} server Server instance
     */
    constructor(server) {
        this.server = server;
    }

    getIgnoreList(table) {
        const player_list = this.sever.config.ignore;

        if (!player_list || !Array.isArray(player_list)) {
            return '';
        }

        return `AND ${table ? table + '.' : ''}player_bisid NOT IN (${player_list.join(',')})`
    }

    queryMostUsedWeapons = async (limit = 10, filter_bisid = null) => {
        let filter = 'attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        return this.server.database.connection
            .raw(`SELECT
                        weapon,
                        count(weapon) as total
                    FROM
                        damage
                    WHERE
                        ${filter}
                    AND
                        weapon != 'MeleeFist'
                    GROUP BY
                        weapon
                    ORDER BY
                        total DESC
                    LIMIT ${limit}`);
    }

    queryMostSuicides = async (limit = 10, filter_bisid = null) => {
        let filter = '';

        if (filter_bisid) {
            filter = `AND killed.player_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
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
                        ${filter}
                        ${ignore}
                    GROUP BY
                        killed.player_bisid
                    ORDER BY
                        deaths DESC
                    LIMIT ${limit}`);
    }

    queryMostHeadShots = async (limit = 10, filter_bisid = null) => {
        let filter = 'damage.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `damage.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(damage.player_bisid) as hits
                    FROM
                        damage
                    LEFT JOIN
                        players
                        ON players.player_bisid = damage.attacker_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    AND
                        damage.body_part = 'Head'
                    GROUP BY
                        damage.attacker_bisid
                    ORDER BY
                        hits DESC
                    LIMIT ${limit}`);
    }

    queryMostKills = async (limit = 10, filter_bisid = null) => {
        let filter = 'killed.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `killed.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(killed.player_bisid) as kills
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.attacker_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        killed.attacker_bisid
                    ORDER BY
                        kills DESC
                    LIMIT ${limit}`);
    }

    queryMostDeaths = async (limit = 10, filter_bisid = null) => {
        let filter = 'killed.player_bisid != \'\'';

        if (filter_bisid) {
            filter = `killed.player_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(killed.player_bisid) as deaths
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.player_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        killed.player_bisid
                    ORDER BY
                        deaths DESC
                    LIMIT ${limit}`);
    }

    queryMostDamageTaken = async (limit = 10, filter_bisid = null) =>{
        let filter = 'damage.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `damage.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(damage.damage) as totalDamage
                    FROM
                        damage
                    LEFT JOIN
                        players
                        ON players.player_bisid = damage.player_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        damage.player_bisid
                    ORDER BY
                        totalDamage DESC
                    LIMIT ${limit}`);
    }

    queryMostDamageGiven = async (limit = 10, filter_bisid = null) => {
        let filter = 'damage.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `damage.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        COUNT(damage.damage) as totalDamage
                    FROM
                        damage
                    LEFT JOIN
                        players
                        ON players.player_bisid = damage.attacker_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        damage.attacker_bisid
                    ORDER BY
                        totalDamage DESC
                    LIMIT ${limit}`);
    }

    queryMostKillsDistance = async (limit = 10, filter_bisid = null) => {
        let filter = 'killed.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `killed.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        distance,
                        weapon
                    FROM
                        killed
                    LEFT JOIN
                        players
                        ON players.player_bisid = killed.attacker_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        killed.attacker_bisid
                    ORDER BY
                        distance * 1 DESC
                    LIMIT ${limit}`);
    }

    queryMostDamageDistance = async (limit = 10, filter_bisid = null) => {
        let filter = 'damage.attacker_bisid != \'\'';

        if (filter_bisid) {
            filter = `damage.attacker_bisid = ${Sqlstring.escape(filter_bisid)}`;
        }

        const ignore = this.getIgnoreList('players');

        return this.server.database.connection
            .raw(`SELECT
                        player_name,
                        distance,
                        weapon
                    FROM
                        damage
                    LEFT JOIN
                        players
                        ON players.player_bisid = damage.attacker_bisid
                    WHERE
                        ${filter}
                        ${ignore}
                    GROUP BY
                        damage.attacker_bisid
                    ORDER BY
                        distance * 1 DESC
                    LIMIT ${limit}`);
    }
}

export default Queries;
