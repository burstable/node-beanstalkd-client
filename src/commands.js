export const commands = [
  ['use', 'USING'],
  ['list-tube-used', 'USING'],
  ['pause-tube', 'PAUSED'],
  ['put', 'INSERTED'],
  ['watch', 'WATCHING'],
  ['ignore', 'WATCHING'],
  ['reserve', 'RESERVED'],
  ['reserve-with-timeout', 'RESERVED'],
  ['delete', 'DELETED'],
  ['bury', 'BURIED'],
  ['release', 'RELEASED'],
  ['touch', 'TOUCHED'],
  ['kick-job', 'KICKED'],
  ['peek', 'FOUND'],
  ['peek-ready', 'FOUND'],
  ['peek-delayed', 'FOUND'],
  ['peek-buried', 'FOUND']
];

export const yamlCommands = [
  ['list-tubes-watched', 'OK'],
  ['list-tubes', 'OK'],
  ['stats-job', 'OK'],
  ['stats-tube', 'OK'],
  ['stats', 'OK']
];
