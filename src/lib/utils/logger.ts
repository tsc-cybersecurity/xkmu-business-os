type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  module?: string
  userId?: string
  [key: string]: unknown
}

function formatMessage(level: LogLevel, message: string, context?: LogContext, error?: unknown): string {
  const timestamp = new Date().toISOString()
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  const err = error instanceof Error ? ` | ${error.message}` : error ? ` | ${String(error)}` : ''
  return `[${timestamp}] ${level.toUpperCase()} ${message}${ctx}${err}`
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: LogContext) {
    console.info(formatMessage('info', message, context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, context))
  },

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(formatMessage('error', message, context, error))
  },
}
