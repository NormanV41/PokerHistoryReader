use pokerdata;

CREATE TABLE tournament (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    start DATETIME NOT NULL,
end DATETIME,
prizePool VARCHAR(50) NOT NULL,
rebuy TINYINT UNSIGNED,
addon TINYINT UNSIGNED,
buyInNoRake DECIMAL(8, 2) NOT NULL,
rake DECIMAL(7, 2),
buyInBounty DECIMAL(8, 2),
currency varchar(10)
);

CREATE TABLE tournament_enrollment (
    tournamentId BIGINT UNSIGNED NOT NULL,
    playerName VARCHAR(50) NOT NULL,
    position MEDIUMINT NOT NULL,
    prize VARCHAR(50) NOT NULL,
    unique key (tournamentId, playerName),
    CONSTRAINT fk_tournament_id FOREIGN KEY (tournamentId) REFERENCES tournament (id),
    CONSTRAINT fk_playerName FOREIGN KEY (playerName) REFERENCES player (username)
);