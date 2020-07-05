USE pokerdata;

CREATE TABLE tournament (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    startTime DATETIME NOT NULL,
    endTime DATETIME,
    prizePool VARCHAR(50) NOT NULL,
    rebuy TINYINT UNSIGNED,
    addon TINYINT UNSIGNED,
    buyInNoRake DECIMAL(8, 2) NOT NULL,
    rake DECIMAL(7, 2),
    buyInBounty DECIMAL(8, 2),
    currency varchar(10)
);

CREATE TABLE player (
    username VARCHAR(50) NOT NULL PRIMARY KEY,
    country VARCHAR(50)
);

CREATE TABLE tournament_enrollment (
    tournamentId BIGINT UNSIGNED NOT NULL,
    playerName VARCHAR(50) NOT NULL,
    position MEDIUMINT NOT NULL,
    prize VARCHAR(50) NOT NULL,
    UNIQUE KEY (tournamentId, playerName),
    CONSTRAINT fk_tournament_id FOREIGN KEY (tournamentId) REFERENCES tournament (id),
    CONSTRAINT fk_playerName FOREIGN KEY (playerName) REFERENCES player (username)
);

CREATE TABLE hand (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    tournamentId BIGINT UNSIGNED,
    date DATETIME NOT NULL,
    smallBlind DECIMAL(9, 2) NOT NULL,
    bigBlind DECIMAL(9, 2) NOT NULL,
    tournamentLevel TINYINT UNSIGNED,
    buttonSeat TINYINT UNSIGNED NOT NULL,
    tableId VARCHAR(20) NOT NULL,
    ante DECIMAL(9, 2) NOT NULL,
    dealtHand json,
    flop json,
    turn json,
    river json,
    totalPot json,
    rake decimal(7,2) not null,
    raw TEXT NOT NULL
);

CREATE TABLE hand_enrollment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    handId BIGINT UNSIGNED NOT NULL,
    playerName VARCHAR(50) NOT NULL,
    seat TINYINT UNSIGNED,
    stack DECIMAL(11, 2),
    UNIQUE KEY (handId, playerName),
    CONSTRAINT fk_handId FOREIGN KEY (handId) REFERENCES hand (id),
    CONSTRAINT fk_playerName2 FOREIGN KEY (playerName) REFERENCES player (username)
);

CREATE TABLE hand_action (
    handId bigint UNSIGNED NOT NULL,
    handEnrollmentId INT,
    phase ENUM(
        'force-bet',
        'preflop',
        'flop',
        'turn',
        'river',
        'show-down',
        'second-show-down'
    ),
    description ENUM(
        'wins bounty',
        'bets',
        'folds',
        'raises',
        'calls',
        'bet returned',
        'collect pot',
        'hide hand',
        'checks',
        'disconnected and time out',
        'said',
        'timed out',
        'sitting out',
        'has returned',
        'connected',
        'rebuys',
        'disconnected',
        'finished tournament',
        'shows hand',
        'wins tournament',
        'leaves table',
        'joins table',
        'post ante',
        'post small blind',
        'post big blind',
        'post small and big blind',
        'play after button',
        'mucks hand',
        'cash out'
    ),
    amount DECIMAL(11, 2),
    raiseToAmount DECIMAL(11, 2),
    message varchar(1000),
    rebuyChipsReceived decimal(9, 2),
    hand json,
    eliminatedPlayer int,
    increasedBountyBy decimal(9, 2),
    finalBounty decimal(9, 2),
    cashOutFee decimal(7,2),
    CONSTRAINT fk_handId2 FOREIGN KEY (handId) REFERENCES hand (id),
    CONSTRAINT fk_handEnrollmentId FOREIGN KEY (handEnrollmentId) REFERENCES hand_enrollment (id),
    CONSTRAINT fk_eliminatedPlayer FOREIGN KEY (eliminatedPlayer) REFERENCES hand_enrollment (id)
);