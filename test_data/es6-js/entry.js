const value = 123;

class SomeClass {
  constructor(...args) {
    this.test = args;
  }

  beep() {
    setTimeout(() => {
      let j = this.test.length;
      console.log('sentinel_1', j);
      j++;
      console.log('sentinel_2', j);
    }, 0);
  }
}

function main(...args) {
  const i = new SomeClass(args);
  i.beep();
}

main(value);
