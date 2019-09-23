export class NoMatchError extends Error {
  constructor() {
    super("Didn't find match"); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}
