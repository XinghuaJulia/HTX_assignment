const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

process.env.NODE_ENV = 'test'

const app = require('../src/app')
const { sequelize } = require('../src/models')

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
