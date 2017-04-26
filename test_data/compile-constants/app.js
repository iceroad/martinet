if (process.env.CONFIG === 'dev') {
  console.log('config:dev');
} else {
  if (process.env.CONFIG === 'prod') {
    console.log('config:prod');
  } else {
    console.log('config:unknown');
  }
}
