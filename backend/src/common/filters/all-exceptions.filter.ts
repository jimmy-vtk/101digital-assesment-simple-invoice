import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { isUniqueViolation } from '../utils/sql.util';

/**
 * Normalises every error into `{ statusCode, message, error }`.
 * Unexpected errors are logged and returned as a generic 500 so internals
 * (SQL, stack traces) never leak to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toErrorBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ErrorResponseDto {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const { message, error } =
        typeof response === 'string'
          ? { message: response, error: undefined }
          : (response as { message?: string | string[]; error?: string });
      return {
        statusCode,
        message: message ?? exception.message,
        error: error ?? STATUS_CODES[statusCode] ?? 'Error',
      };
    }

    // Safety net: services map known constraints themselves.
    if (isUniqueViolation(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'Conflict',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }
}
