import Express from 'express'
import { literal, number, object, type } from 'superstruct'
import supertest from 'supertest'
import { TypedRouter, ValidatedRequest, ValidationErrorHandler } from './index'

const TestExpressApp = (router: Express.RequestHandler) => {
  const app = Express()
  app.use(Express.urlencoded({ extended: true }))
  app.use(Express.json())
  app.use(router)
  return app
}

test('validator passes request handler is invoked', async () => {
  const router = TypedRouter()

  const validator = type({
    query: object({
      isParam: literal('true'),
    }),
  })

  router.get(
    '/testroute',
    ValidatedRequest(validator, (_, { query: { isParam } }, res) => {
      if (isParam === 'true') {
        res.status(200).send({ success: true })
      } else {
        res.status(200).send({ success: false })
      }
    })
  )

  const app = TestExpressApp(router)

  const response = await supertest(app).get('/testroute?isParam=true')

  expect(response.body).toEqual({ success: true })
})

test('invalid request default error handler is invoked and request returns 400 BAD_REQUEST', async () => {
  const router = TypedRouter()

  const validator = type({
    query: object({
      isParam: literal('true'),
    }),
    body: object({
      data: number(),
    }),
  })

  router.post(
    '/testroute',
    ValidatedRequest(
      validator,
      (_, { query: { isParam }, body: { data } }, res) => {
        if (isParam === 'true' && data === 42) {
          res.status(200).send({ success: true })
        } else {
          res.status(200).send({ success: false })
        }
      }
    )
  )

  const app = TestExpressApp(router)

  const response = await supertest(app)
    .post('/testroute?isParam=true')
    .send({ data: '42' })

  expect(response.statusCode).toBe(400)
  expect(response.body).toEqual({
    errors: [
      {
        message: `Validation error for key <data> at body->data: Expected a number, but received: "42"`,
      },
    ],
  })
})

test('invalid request custom error handler is invoked', async () => {
  const router = TypedRouter()

  const validator = type({
    query: object({
      isParam: literal('true'),
    }),
    body: object({
      data: number(),
    }),
  })

  const customErrorHandler: ValidationErrorHandler<Express.Request> = jest.fn(
    (req, error, res) => {
      res.status(418).send({ message: `I'm a teapot` })
    }
  )

  router.post(
    '/testroute',
    ValidatedRequest(
      validator,
      (_, { query: { isParam }, body: { data } }, res) => {
        if (isParam === 'true' && data === 42) {
          res.status(200).send({ success: true })
        } else {
          res.status(200).send({ success: false })
        }
      },
      customErrorHandler
    )
  )

  const app = TestExpressApp(router)

  const response = await supertest(app)
    .post('/testroute?isParam=true')
    .send({ data: '42' })

  expect(response.statusCode).toBe(418)
  expect(response.body).toEqual({ message: `I'm a teapot` })
  expect(customErrorHandler).toBeCalledTimes(1)
})
