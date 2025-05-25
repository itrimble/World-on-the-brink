import { createLogger, LogLevel } from './logger'; // Assuming LogLevel is exported for testing different levels

// Spy on console methods
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Logger', () => {
  const moduleName = 'TestModule';
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    // Reset mocks before each test
    consoleDebugSpy.mockClear();
    consoleInfoSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    logger = createLogger(moduleName);
    // Note: CURRENT_LOG_LEVEL is set to DEBUG in logger.ts for these tests
    // To test different log levels, you might need to mock CURRENT_LOG_LEVEL or have multiple logger instances
    // For simplicity here, we assume CURRENT_LOG_LEVEL is DEBUG.
  });

  test('should format message correctly with module name and message', () => {
    logger.info('Test message');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleInfoSpy.mock.calls[0][0];
    expect(loggedMessage).toMatch(new RegExp(`^\\[INFO\\] \\[${moduleName}\\] Test message$`)); // Basic check, ignoring timestamp
  });

  test('should include string data in the log message', () => {
    logger.info('Test message with string data', 'some string data');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleInfoSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('| Data: some string data');
  });

  test('should include number data in the log message', () => {
    logger.info('Test message with number data', 12345);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleInfoSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('| Data: 12345');
  });

  test('should JSON.stringify object data in the log message', () => {
    const testData = { key: 'value', nested: { num: 1 } };
    logger.info('Test message with object data', testData);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleInfoSpy.mock.calls[0][0];
    expect(loggedMessage).toContain(`| Data: ${JSON.stringify(testData, null, 2)}`);
  });
  
  test('should handle error during JSON.stringify for object data', () => {
    const circularData: any = { key: 'value' };
    circularData.self = circularData; // Create circular reference
    logger.info('Test message with circular object data', circularData);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleInfoSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('| Data: (Error serializing data: '); // Check for error message part
  });


  test('debug method should call console.debug', () => {
    logger.debug('Debug test');
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    expect(consoleDebugSpy.mock.calls[0][0]).toMatch(/\[DEBUG\] \[TestModule\] Debug test/);
  });

  test('info method should call console.info', () => {
    logger.info('Info test');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy.mock.calls[0][0]).toMatch(/\[INFO\] \[TestModule\] Info test/);
  });

  test('warn method should call console.warn', () => {
    logger.warn('Warn test');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(/\[WARN\] \[TestModule\] Warn test/);
  });

  test('error method should call console.error and include error message', () => {
    const errorMessage = 'This is an error object message';
    const testError = new Error(errorMessage);
    logger.error('Error test', testError);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toMatch(/\[ERROR\] \[TestModule\] Error test/);
    expect(loggedMessage).toContain(`| Error: ${errorMessage}`);
    if (testError.stack) {
      expect(loggedMessage).toContain(`Stack: ${testError.stack}`);
    }
  });
  
  test('error method should handle non-Error object as error', () => {
    const errorDetails = { code: 500, reason: "Server down" };
    logger.error('Error test with object', errorDetails);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain(`| ErrorDetails: ${JSON.stringify(errorDetails, null, 2)}`);
  });
  
  test('error method should handle string as error', () => {
    const errorString = "A simple error string";
    logger.error('Error test with string error', errorString);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain(`| Error: ${errorString}`);
  });

  test('error method should include additional data if provided', () => {
    const additionalData = { context: 'during API call' };
    logger.error('Error with additional data', new Error('Network failed'), additionalData);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain(`| Data: ${JSON.stringify(additionalData, null, 2)}`);
  });

  // To test log level filtering properly, we would need to modify CURRENT_LOG_LEVEL
  // or use a more advanced setup. The current tests assume CURRENT_LOG_LEVEL = LogLevel.DEBUG.
  // For example, if CURRENT_LOG_LEVEL was INFO, debug calls should not go through.
  // This can be simulated by temporarily changing the const in the logger module via jest.mock,
  // but that's more involved. The current tests verify that if a level *is* active, it logs.
});

// Example of how one might test log level filtering if CURRENT_LOG_LEVEL could be mocked:
// describe('Logger - Log Level Filtering (Conceptual)', () => {
//   const moduleName = 'FilteredModule';
//   // Mocking CURRENT_LOG_LEVEL to LogLevel.INFO for this test suite
//   // jest.mock('./logger', () => {
//   //   const originalModule = jest.requireActual('./logger');
//   //   return {
//   //     ...originalModule,
//   //     __esModule: true,
//   //     // CURRENT_LOG_LEVEL: originalModule.LogLevel.INFO, // This doesn't work for const
//   //     // Need to re-evaluate how to mock or test this effectively without changing source
//   //   };
//   // });
// 
//   // This test would fail with current setup as CURRENT_LOG_LEVEL is DEBUG
//   // test('debug messages should be suppressed if log level is INFO', () => {
//   //   const logger = createLogger(moduleName);
//   //   logger.debug('This should not be logged');
//   //   expect(consoleDebugSpy).not.toHaveBeenCalled();
//   //   logger.info('This should be logged');
//   //   expect(consoleInfoSpy).toHaveBeenCalled();
//   // });
// });
```
