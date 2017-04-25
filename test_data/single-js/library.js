function func1(arg) {
  console.log('sentinel_1');
  return arg.toLowerCase();
}

function func2(arg) {
  console.log('sentinel_2');
  return Math.floor(arg);
}

export { func1, func2 };
