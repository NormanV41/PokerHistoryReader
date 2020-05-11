# PokerHistoryParser

A cli that parse hand histories and tournament summaries from Pokerstars, then it saves the data to a mysql database.

## Installation

To use it you clone the repository, then to install dependencies run

```
npm install
```

To compile run

```
 npm run create
```

## Usage

To use it make sure you have a mysql database.
Then add the following file `$CONFIG/configstore/pockerparser.json` with the following content 
```
{
  "db_user": "<username>",
  "db_password": "<password>",
  "db_database": "<database url>"
}

```

Then run the `sql-scripts/create-tables.sql` script.

To use the application run

```
pokerparser --help
```
