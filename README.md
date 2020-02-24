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

To use it make sure have mysql ready in your machine, then add a secrets.json file at same level of the package.json. The secrets.json file is expected to have the mysql authentication data.

```
{
"user": "myUsername",
"password":"myPassword"
}
```

Then run the create-tables.sql script.

To use the application run

```
pokerparser --help
```
