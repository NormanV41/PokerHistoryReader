import { createConnection, Query, MysqlError, QueryOptions } from "mysql";
import { Subject } from "rxjs";
import { databaseSecrets } from "../config";

export class DatabaseConnection {
  public connection = createConnection({
    host: "localhost",
    user: databaseSecrets.user,
    password: databaseSecrets.password,
    database: "pokerdata",
    multipleStatements: true
  });

  constructor() {
    this.connection.connect((error) => {
      if (error) {
        console.error("Error connecting to database");
        throw error;
      }
      console.log("connection established");
    });
  }

  public query(
    query: QueryOptions,
    callback: (error: MysqlError | null, response: any) => void
  ): Query {
    return this.connection.query(query, callback);
  }

  public end(message: string) {
    this.connection.end((error) => {
      if (error) {
        throw error;
      }
      console.log(message);
    });
  }
}
