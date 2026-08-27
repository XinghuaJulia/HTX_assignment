const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

process.env.NODE_ENV = 'test'

const app = require('../src/app')
const { sequelize, Scenario } = require('../src/models')

const validConfig = {
  scenario: 'credential_theft',
  users: 2,
  devices: 2,
  events: 25,
  seed: 42,
}

const waitForCompletion = async (scenarioId) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await request(app).get(`/api/scenarios/${scenarioId}`)

    assert.equal(response.status, 200)

    if (response.body.status === 'completed') return response.body
    if (response.body.status === 'failed') {
      assert.fail(`Generation failed: ${response.body.generation_error.message}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  assert.fail(`Scenario ${scenarioId} did not complete in time`)
}

describe('Scenario REST APIs', () => {
test.beforeEach(async () => {
  await sequelize.sync({ force: true })
})

test.after(async () => {
  await sequelize.close()
})

test('GET /health reports that the service is available', async () => {
  const response = await request(app).get('/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { status: 'ok' })
})

test('POST creates an asynchronous job that can be retrieved', async () => {
  const accepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)

  assert.equal(accepted.status, 202)
  assert.equal(accepted.body.status, 'pending')
  assert.match(accepted.body.id, /^scenario-/)
  assert.equal(
    accepted.headers.location,
    `/api/scenarios/${accepted.body.id}`,
  )

  const completed = await waitForCompletion(accepted.body.id)

  assert.equal(completed.status, 'completed')
  assert.equal(completed.scenario.users.length, validConfig.users)
  assert.equal(completed.scenario.devices.length, validConfig.devices)
  assert.equal(completed.scenario.events.length, validConfig.events)
  assert.equal(completed.scenario.ground_truth.attack_chain.length, 5)

  const userIds = new Set(completed.scenario.users.map((user) => user.id))
  const deviceIds = new Set(
    completed.scenario.devices.map((device) => device.id),
  )

  for (const device of completed.scenario.devices) {
    assert.ok(userIds.has(device.assigned_user_id))
  }

  for (const event of completed.scenario.events) {
    assert.ok(userIds.has(event.actor_user_id))
    assert.ok(deviceIds.has(event.device_id))
  }

  for (const step of completed.scenario.ground_truth.attack_chain) {
    assert.ok(
      completed.scenario.events.some((event) => event.id === step.event_id),
    )
  }
})

test('POST rejects invalid configurations', async (t) => {
  const invalidConfigurations = [
    {
      name: 'missing seed',
      config: { ...validConfig, seed: undefined },
    },
    {
      name: 'unsupported scenario type',
      config: { ...validConfig, scenario: 'ransomware' },
    },
    {
      name: 'fewer than five events',
      config: { ...validConfig, events: 4 },
    },
    {
      name: 'numeric string',
      config: { ...validConfig, users: '2' },
    },
  ]

  for (const invalid of invalidConfigurations) {
    await t.test(invalid.name, async () => {
      const response = await request(app)
        .post('/api/scenarios')
        .send(invalid.config)

      assert.equal(response.status, 400)
      assert.equal(response.body.error, 'invalid_configuration')
    })
  }
})

test('POST rejects malformed JSON', async () => {
  const response = await request(app)
    .post('/api/scenarios')
    .set('Content-Type', 'application/json')
    .send('{"scenario":')

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, {
    error: 'malformed_json',
    message: 'Request body contains invalid JSON',
  })
})

test('GET returns 404 for an unknown scenario', async () => {
  const response = await request(app).get('/api/scenarios/does-not-exist')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'scenario_not_found',
    message: 'Scenario does-not-exist was not found',
  })
})

test('equivalent API jobs return deterministic scenario content', async () => {
  const firstAccepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  const first = await waitForCompletion(firstAccepted.body.id)

  const secondAccepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  const second = await waitForCompletion(secondAccepted.body.id)

  assert.notEqual(first.id, second.id)
  assert.deepEqual(first.scenario, second.scenario)
})

test('GET /events returns one requested event', async () => {
  const accepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  const completed = await waitForCompletion(accepted.body.id)
  const expectedEvent = completed.scenario.events.find(
    (event) => event.id === 'event-003',
  )

  const response = await request(app)
    .get(`/api/scenarios/${accepted.body.id}/events`)
    .query({ event: 'event-003' })

  assert.equal(response.status, 200)
  assert.equal(response.body.scenario_id, accepted.body.id)
  assert.deepEqual(response.body.event, expectedEvent)
})

test('GET /events requires an event query parameter', async () => {
  const accepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  await waitForCompletion(accepted.body.id)

  const response = await request(app).get(
    `/api/scenarios/${accepted.body.id}/events`,
  )

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, {
    error: 'invalid_event_id',
    message: 'event query parameter is required',
  })
})

test('GET /events returns 404 for an unknown event', async () => {
  const accepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  await waitForCompletion(accepted.body.id)

  const response = await request(app)
    .get(`/api/scenarios/${accepted.body.id}/events`)
    .query({ event: 'event-999' })

  assert.equal(response.status, 404)
  assert.equal(response.body.error, 'event_not_found')
})

test('GET /events rejects a scenario that is not completed', async () => {
  await Scenario.create({
    id: 'scenario-pending-events',
    scenarioType: validConfig.scenario,
    requestedUsers: validConfig.users,
    requestedDevices: validConfig.devices,
    requestedEvents: validConfig.events,
    seed: validConfig.seed,
    status: 'pending',
  })

  const response = await request(app)
    .get('/api/scenarios/scenario-pending-events/events')
    .query({ event: 'event-001' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error, 'scenario_not_completed')
})

test('POST /validate reports a completed scenario as valid', async () => {
  const accepted = await request(app)
    .post('/api/scenarios')
    .send(validConfig)
  await waitForCompletion(accepted.body.id)

  const response = await request(app).post(
    `/api/scenarios/${accepted.body.id}/validate`,
  )

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, {
    id: accepted.body.id,
    status: 'completed',
    valid: true,
    errors: [],
  })
})

test('POST /validate reports invariant errors in stored data', async () => {
  await Scenario.create({
    id: 'scenario-invalid',
    scenarioType: validConfig.scenario,
    requestedUsers: validConfig.users,
    requestedDevices: validConfig.devices,
    requestedEvents: validConfig.events,
    seed: validConfig.seed,
    status: 'completed',
  })

  const response = await request(app).post(
    '/api/scenarios/scenario-invalid/validate',
  )

  assert.equal(response.status, 200)
  assert.equal(response.body.valid, false)
  assert.ok(response.body.errors.length > 0)
})

test('POST /validate rejects a scenario that is not completed', async () => {
  await Scenario.create({
    id: 'scenario-pending',
    scenarioType: validConfig.scenario,
    requestedUsers: validConfig.users,
    requestedDevices: validConfig.devices,
    requestedEvents: validConfig.events,
    seed: validConfig.seed,
    status: 'pending',
  })

  const response = await request(app).post(
    '/api/scenarios/scenario-pending/validate',
  )

  assert.equal(response.status, 409)
  assert.deepEqual(response.body, {
    error: 'scenario_not_completed',
    message: 'Scenario scenario-pending has status pending',
  })
})

test('POST /validate returns 404 for an unknown scenario', async () => {
  const response = await request(app).post(
    '/api/scenarios/does-not-exist/validate',
  )

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'scenario_not_found',
    message: 'Scenario does-not-exist was not found',
  })
})

test.todo('returns running while generation is in progress')
test.todo('returns failed status when scenario generation throws')
})
