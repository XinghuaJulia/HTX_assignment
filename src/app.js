const crypto = require('node:crypto')
const express = require('express')
const { ValidationError } = require('sequelize')
const { Scenario } = require('./models')
const {
  generateAndStoreScenario,
  getCompletedScenario,
} = require('./scenarioService')

const app = express()

app.use(express.json())

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

app.post('/api/scenarios', async (request, response, next) => {
  try {
    const config = request.body ?? {}
    const job = await Scenario.create({
      id: `scenario-${crypto.randomUUID()}`,
      scenarioType: config.scenario,
      requestedUsers: config.users,
      requestedDevices: config.devices,
      requestedEvents: config.events,
      seed: config.seed,
    })

    setImmediate(() => generateAndStoreScenario(job.id))

    return response
      .location(`/api/scenarios/${job.id}`)
      .status(202)
      .json({
        id: job.id,
        status: job.status,
      })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/scenarios/:id', async (request, response, next) => {
  try {
    const job = await Scenario.findByPk(request.params.id)

    if (!job) {
      return response.status(404).json({
        error: 'scenario_not_found',
        message: `Scenario ${request.params.id} was not found`,
      })
    }

    const body = {
      id: job.id,
      status: job.status,
    }

    if (job.status === 'completed') {
      body.scenario = await getCompletedScenario(job)
    }

    if (job.status === 'failed') {
      body.generation_error = {
        message: job.errorMessage,
      }
    }

    return response.status(200).json(body)
  } catch (error) {
    return next(error)
  }
})

app.use((error, _request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return response.status(400).json({
      error: 'malformed_json',
      message: 'Request body contains invalid JSON',
    })
  }

  return next(error)
})

app.use((error, _request, response, next) => {
  if (error instanceof ValidationError) {
    return response.status(400).json({
      error: 'invalid_configuration',
      message: 'The scenario configuration is invalid',
      details: error.errors.map((item) => ({
        field: item.path,
        message: item.message,
      })),
    })
  }

  return next(error)
})

app.use((error, _request, response, _next) => {
  console.error(error)

  return response.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
  })
})

module.exports = app
