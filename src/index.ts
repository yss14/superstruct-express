import * as Express from "express";
import { Struct, StructError, validate } from "superstruct";

type NonEmpty<Type> = [Type, ...Type[]];

const isErrorResult = <T>(
  validationResult: [StructError | undefined, T | undefined]
): validationResult is [StructError, undefined] =>
  !!validationResult[0] && !validationResult[1];

export type TypedRequestHandler<TRequest extends Express.Request> = (
  request: TRequest,
  response: Express.Response,
  next: Express.NextFunction
) => void | Promise<void>;

export type ValidationErrorHandler<TRequest extends Express.Request> = (
  req: TRequest,
  validationError: StructError,
  res: Express.Response,
  next: Express.NextFunction
) => void;

const defaultValidationErrorHandler: ValidationErrorHandler<Express.Request> = (
  _,
  validationError,
  res
) => {
  const errors: Error[] = [];

  for (const err of validationError.failures()) {
    errors.push(
      new Error(
        `Validation error for key <${err.key}> at ${err.path.join("->")}: ${
          err.message
        }`
      )
    );
  }

  res.status(400).send({ errors });

  return;
};

export type ValidatedRequestHandler<TRequest, TValidationResult> = (
  request: TRequest,
  validationResult: TValidationResult,
  response: Express.Response,
  next: Express.NextFunction
) => void | Promise<void>;

export const ValidatedRequest =
  <TRequest extends Express.Request, TValidationResult>(
    validator: Struct<TValidationResult, unknown>,
    handler: ValidatedRequestHandler<TRequest, TValidationResult>,
    errorHandler: ValidationErrorHandler<TRequest> = defaultValidationErrorHandler
  ): TypedRequestHandler<TRequest> =>
  (req, res, next) => {
    const validationResult = validate(req, validator, {
      coerce: true,
      mask: false,
    });

    if (isErrorResult(validationResult)) {
      return errorHandler(req, validationResult[0], res, next);
    } else {
      return handler(req, validationResult[1], res, next);
    }
  };

export type RESTMethod<TRequest extends Express.Request> = {
  <TRequestCustomization>(
    path: string,
    check: TypedRequestHandler<TRequest & Partial<TRequestCustomization>>,
    ...middleware: NonEmpty<
      TypedRequestHandler<TRequestCustomization & TRequest>
    >
  ): TypedRouter<TRequest>;
  (
    path: string,
    middleware: TypedRequestHandler<TRequest>
  ): TypedRouter<TRequest>;
};

export interface TypedRouter<TRequest extends Express.Request> {
  use: (<TRequestCustomization>(
    ...middleware: TypedRequestHandler<
      TRequest & Partial<TRequestCustomization>
    >[]
  ) => TypedRouter<TRequestCustomization & TRequest>) &
    (<TRequestCustomization>(
      path: string,
      ...middleware: TypedRequestHandler<
        TRequest & Partial<TRequestCustomization>
      >[]
    ) => TypedRouter<TRequestCustomization & TRequest>);
  get: RESTMethod<TRequest>;
  put: RESTMethod<TRequest>;
  post: RESTMethod<TRequest>;
  patch: RESTMethod<TRequest>;
  delete: RESTMethod<TRequest>;
  head: RESTMethod<TRequest>;
  move: RESTMethod<TRequest>;
  options: RESTMethod<TRequest>;
  trace: RESTMethod<TRequest>;
}

export const TypedRouter = <
  TRequest extends Express.Request
>(): TypedRouter<TRequest> & Express.Router => {
  const router = Express.Router();

  return router as TypedRouter<TRequest> & Express.Router;
};
