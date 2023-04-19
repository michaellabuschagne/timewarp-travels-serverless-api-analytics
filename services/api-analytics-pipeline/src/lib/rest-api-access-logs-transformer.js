export const transformApiGwAccessLog = logEvent => {
  console.debug(`log event -> ${JSON.stringify(logEvent)}`);

  const sanitized = sanitizeLogMessage(logEvent.message);

  sanitized
    ? console.log(`Adding matching event ${sanitized}`)
    : console.log(`Nothing matched, doing nothing...`);

  return Promise.resolve(sanitized ? `${sanitized}\n` : "");
};

const sanitizeLogMessage = logMessage => {
  try {
    JSON.parse(logMessage);
  } catch (e) {
    return undefined;
  }
  return logMessage.replace(/"-"/g, `""`);
};
