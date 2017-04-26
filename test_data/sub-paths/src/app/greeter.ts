class Greeter {
    constructor(public greeting: string) { }
    greet() {
        return "<h1>" + this.greeting + "</h1>";
    }
};

const greeter = new Greeter("Hello, world!");

console.log(greeter.greet());
