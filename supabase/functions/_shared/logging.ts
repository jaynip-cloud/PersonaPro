export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

interface LogContext {
  functionName: string;
  step?: string;
  userId?: string;
  clientName?: string;
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, data?: any): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? `[${context.functionName}${context.step ? `:${context.step}` : ''}]` : '';
    const userIdStr = context?.userId ? `[User:${context.userId.substring(0, 8)}]` : '';
    const clientStr = context?.clientName ? `[Client:${context.clientName}]` : '';
    
    return `[${timestamp}] [${level}] ${contextStr} ${userIdStr} ${clientStr} ${message}`;
  }

  log(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    const logMessage = this.formatLog(level, message, context);
    
    if (data) {
      console.log(logMessage, '\n', JSON.stringify(data, null, 2));
    } else {
      console.log(logMessage);
    }
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log('INFO', message, context, data);
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.log('WARN', message, context, data);
  }

  error(message: string, context?: LogContext, data?: any): void {
    this.log('ERROR', message, context, data);
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.log('DEBUG', message, context, data);
  }

  success(message: string, context?: LogContext, data?: any): void {
    this.log('SUCCESS', message, context, data);
  }

  step(stepName: string, message: string, context?: LogContext, data?: any): void {
    this.info(`STEP: ${stepName} - ${message}`, { ...context, step: stepName }, data);
  }

  startFlow(flowName: string, context?: LogContext, data?: any): void {
    console.log('\n' + '='.repeat(80));
    this.info(`🚀 STARTING FLOW: ${flowName}`, context, data);
    console.log('='.repeat(80) + '\n');
  }

  endFlow(flowName: string, context?: LogContext, data?: any): void {
    console.log('\n' + '='.repeat(80));
    this.success(`✅ COMPLETED FLOW: ${flowName}`, context, data);
    console.log('='.repeat(80) + '\n');
  }

  apiCall(apiName: string, method: string, url: string, context?: LogContext): void {
    this.info(`🌐 API CALL: ${method} ${apiName}`, context, { url });
  }

  apiResponse(apiName: string, status: number, duration: number, context?: LogContext, data?: any): void {
    const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌';
    this.info(`${statusEmoji} API RESPONSE: ${apiName}`, context, {
      status,
      duration: `${duration}ms`,
      ...data
    });
  }
}

export const logger = new Logger();
export type { LogContext };

