export class NotANumberError extends Error {
  constructor() {
    super("Not a number"); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}
