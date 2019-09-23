export class NoSingleMatchError extends Error {
  constructor() {
    super("find more than one match"); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}
