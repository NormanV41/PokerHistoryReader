import { startConnectionWithDatabase } from "../methods";
import { Observable } from "rxjs";

export const getIds$ = new Observable<Array<{ id: number }>>((subscriber) => {
  startConnectionWithDatabase((connection) => {
    connection.query(
      { sql: "select id from hand" },
      (error, response: Array<{ id: number }>) => {
        if (error) {
          subscriber.error(error);
        }
        subscriber.next(response);
        subscriber.complete();
      }
    );
  });
});
