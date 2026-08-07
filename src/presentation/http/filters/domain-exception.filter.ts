import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  EntityNotFoundError,
  InvalidCredentialsError,
} from '../../../domain/shared/errors/domain-error';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusFor(exception);
    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status],
      message: exception.message,
    });
  }
}

function statusFor(exception: DomainError) {
  if (exception instanceof InvalidCredentialsError) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (exception instanceof EntityNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }
  if (exception instanceof ConflictError) {
    return HttpStatus.CONFLICT;
  }
  if (exception instanceof BusinessRuleError) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.BAD_REQUEST;
}
