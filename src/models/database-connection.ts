import { createConnection, Query, MysqlError, QueryOptions } from "mysql";
import { Subject } from "rxjs";
import { databaseSecrets } from "../config";

export class DatabaseConnection {
  public connection = createConnection({
    host: "localhost",
    user: databaseSecrets.user,
    password: databaseSecrets.password,
    database: databaseSecrets.database,
    multipleStatements: true
  });
  private counter = 0;
  private allQueriesEnded$ = new Subject<void>();

  constructor() {
    this.connection.connect((error) => {
      if (error) {
        console.error("Error connecting to database");
        throw error;
      }
      console.log("connection established");
    });
    this.allQueriesEnded$.subscribe(() => {
      this.connection.end((err) => {
        if (err) {
          throw err;
        }
        console.log("closing connection");
      });
    });
  }

  public query(
    query: QueryOptions,
    callback: (error: MysqlError | null, response: any) => void
  ): Query {
    this.counter++;
    const extendCallback = (error: MysqlError | null, response: any) => {
      this.counter--;
      if (this.counter === 0) {
        this.allQueriesEnded$.next();
      }
      callback(error, response);
    };
    return this.connection.query(query, extendCallback);
  }
}
