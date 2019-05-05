CREATE TABLE IF NOT EXISTS `damage` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `timestamp` varchar(19) NOT NULL,
  `player_bisid` varchar(44) NOT NULL,
  `player_pos` varchar(25) NOT NULL,
  `player_hp` decimal(7,4) NOT NULL,
  `attacker_bisid` varchar(44) NOT NULL,
  `attacker_pos` varchar(25) NOT NULL,
  `attacker_npc` varchar(35) NOT NULL,
  `body_part` varchar(50) NOT NULL,
  `damage` decimal(6,2) NOT NULL,
  `weapon` varchar(35) NOT NULL,
  `distance` decimal(8,4) NOT NULL,
  `logfile_id` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_bisid` (`player_bisid`),
  KEY `attacker_bisid` (`attacker_bisid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `killed` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `timestamp` varchar(19) NOT NULL,
  `player_bisid` varchar(44) NOT NULL,
  `player_pos` varchar(25) NOT NULL,
  `attacker_bisid` varchar(44) NOT NULL,
  `attacker_pos` varchar(25) NOT NULL,
  `attacker_npc` varchar(35) NOT NULL,
  `weapon` varchar(35) NOT NULL,
  `distance` decimal(8,4) NOT NULL,
  `logfile_id` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_bisid` (`player_bisid`),
  KEY `attacker_bisid` (`attacker_bisid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `link_tokens` (
  `discord_id` varchar(22) NOT NULL,
  `token` varchar(25) NOT NULL,
  PRIMARY KEY (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `logs` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `file_name` varchar(60) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `file_name` (`file_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `players` (
  `discord_id` varchar(22) NOT NULL,
  `player_bisid` varchar(44) NOT NULL,
  `player_steamid` varchar(17) NOT NULL,
  `player_name` varchar(32) NOT NULL,
  PRIMARY KEY (`player_bisid`),
  KEY `player_steamid` (`player_steamid`),
  KEY `discord_id` (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;