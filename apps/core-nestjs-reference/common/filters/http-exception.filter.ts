import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Ha ocurrido un error interno en el servidor' };

    const errorDetails =
      exception instanceof Error
        ? exception.stack || exception.message
        : JSON.stringify(exception);

    this.logger.error(
      `HTTP Error ${status} - Route: ${request?.url} - Internal Details: ${errorDetails}`
    );

    if (response && typeof response.status === 'function') {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request?.url,
        error: typeof message === 'string' ? { message } : message,
      });
    }
  }
}
