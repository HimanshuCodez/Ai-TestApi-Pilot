type LogFields = Record<string, unknown>;

function line(level: string, message: string, fields?: LogFields) {
  const payload = { level, message, time: new Date().toISOString(), ...fields };
  return JSON.stringify(payload);
}

export const logger = {
  info(message: string, fields?: LogFields) {
    console.log(line("info", message, fields));
  },
  warn(message: string, fields?: LogFields) {
    console.warn(line("warn", message, fields));
  },
  error(message: string, fields?: LogFields) {
    console.error(line("error", message, fields));
  },
};
