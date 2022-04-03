# superstruct-express

[![BuildTest](https://github.com/yss14/superstruct-express/actions/workflows/build.yaml/badge.svg?branch=main)](https://github.com/yss14/superstruct-express/actions/workflows/build.yaml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)

Type-Safe Express Middleware for Superstruct Data Validation Library

## Installation

```bash
npm i superstruct-express

yarn add superstruct-express

pnpm add superstruct-express
```

`superstruct-express` requires both `superstruct` and `express` as peer dependency installed.

If you are about to setup a new project from scratch, use the following command:

```bash
npm i express superstruct superstruct-express

yarn add express superstruct superstruct-express

pnpm add express superstruct superstruct-express
```

## Example

`superstruct-express` exports an extension to the plain express `Router` supporting full type-safety. From there you can simply register your desired express routes with `superstruct` validators via the `ValidatedRequest` middleware.

```typescript
import {
  TypedRouter,
  ValidatedRequest,
  ValidationErrorHandler,
} from 'superstruct-express'
import { literal, number, object, type, string } from 'superstruct'

const router = TypedRouter()

const validator = type({
  query: object({
    populated: optional(literal('true')),
  }),
  param: object({
    userId: string(),
  }),
})

router.get(
  '/my/api/users',
  ValidatedRequest(
    validator,
    async (_, { query: { populated }, param: { userId } }, res) => {
      // here <populated> is of type boolean | undefined and <userId> of type string

      const user = await getUserFromDB(userId, populated)

      res.json(user).end()
    }
  )
)
```

### Custom Error Handler

`ValidatedRequest` supports as a third argument a custom error handler.

```typescript
import {
  ValidatedRequest,
  ValidationErrorHandler,
  ValidationErrorHandler,
} from 'superstruct-express'

const customErrorHandler: ValidationErrorHandler<Express.Request> = (
  req,
  error,
  res
) => {
  // typeof error = StructError
  console.error(error)
  // do whatever you want with the error and return it in some way as request response
  res.status(400).send(error.toString())
}

router.get(
  '/my/api/users',
  ValidatedRequest(
    validator,
    async (_, { query: { populated }, param: { userId } }, res) => {
      // here <populated> is of type boolean | undefined and <userId> of type string

      const user = await getUserFromDB(userId, populated)

      res.json(user).end()
    },
    customErrorHandler
  )
)
```

### Pre-Checked Router Context

`TypedRouter` supports a router context via generics. This can be useful if you register a router-wide middleware, e.g. some authentication middleware.

```typescript
interface AuthenticatedRouter {
  user: User
}

const rootRouter = TypedRouter()
rootRouter.use(myAuthMiddleware) // middleware checks authentication and sets req.user property if successful

const router = TypedRouter<AuthenticatedRouter>()
rootRouter.use(router)

const validator = type({
  query: object({
    populated: optional(literal('true')),
  }),
})

router.get(
  '/my/api/orders',
  ValidatedRequest(
    validator,
    async ({ user }, { query: { populated }, param: { userId } }, res) => {
      // here we can consume the context properties - in this case the <user> property

      const orders = await getOrdersOfUser(user.id, populated)

      res.json(orders).end()
    }
  )
)
```

## License

MIT
