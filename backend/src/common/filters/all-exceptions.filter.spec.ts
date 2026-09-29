import { ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('formats HTTP exceptions consistently', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Invoice not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Invoice not found',
      error: 'Not Found',
    });
  });

  it('keeps validation message arrays', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['dueDate must be on or after invoiceDate']), host);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['dueDate must be on or after invoiceDate'],
      error: 'Bad Request',
    });
  });

  it('maps unhandled unique violations to 409', () => {
    const { host, json } = mockHost();
    const error = new QueryFailedError('', [], Object.assign(new Error(), { code: '23505' }));
    filter.catch(error, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('hides internal error details behind a generic 500', () => {
    const { host, json } = mockHost();
    filter.catch(new Error('connection to db at 10.0.0.1 failed'), host);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });
});
