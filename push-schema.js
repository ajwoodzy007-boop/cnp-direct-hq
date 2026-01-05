const { spawn } = require('child_process');

const drizzle = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Send "1" for each prompt (create table)
drizzle.stdin.write('1\n'); // portfolios
setTimeout(() => drizzle.stdin.write('1\n'), 1000); // simulation_results

drizzle.on('close', (code) => {
  console.log(`Drizzle process exited with code ${code}`);
});
