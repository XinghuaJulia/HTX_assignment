const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const generateScenario = require('../src/generator')

const config = {
  scenario: 'credential_theft',
  users: 2,
  devices: 2,
  events: 25,
  seed: 42,
}

describe('Deterministic scenario generator', () => {
test('generates equivalent output for the same configuration and seed', () => {
  assert.deepEqual(generateScenario(config), generateScenario(config))
})

test('fixed seed produces expected representative values', () => {
  const scenario = generateScenario(config)

  assert.equal(scenario.metadata.timeline_start, '2025-08-17T00:45:00.000Z')
  assert.deepEqual(scenario.users[0], {
    id: 'user-001',
    username: 'riley001',
    role: 'administrator',
  })
  assert.equal(scenario.devices[0].os, 'Windows')
  assert.equal(scenario.events[0].id, 'event-001')
  assert.equal(
    scenario.events[0].timestamp,
    scenario.metadata.timeline_start,
  )
})

test('respects requested counts and creates unique IDs', () => {
  const scenario = generateScenario(config)
  const ids = [
    ...scenario.users.map((user) => user.id),
    ...scenario.devices.map((device) => device.id),
    ...scenario.events.map((event) => event.id),
  ]

  assert.equal(scenario.users.length, config.users)
  assert.equal(scenario.devices.length, config.devices)
  assert.equal(scenario.events.length, config.events)
  assert.equal(new Set(ids).size, ids.length)
})

test('all generated references point to existing entities', () => {
  const scenario = generateScenario(config)
  const userIds = new Set(scenario.users.map((user) => user.id))
  const deviceIds = new Set(scenario.devices.map((device) => device.id))

  for (const device of scenario.devices) {
    assert.ok(userIds.has(device.assigned_user_id))
  }

  for (const event of scenario.events) {
    assert.ok(userIds.has(event.actor_user_id))
    assert.ok(deviceIds.has(event.device_id))
  }
})

test('events are chronological and contain the required attack chain', () => {
  const scenario = generateScenario(config)
  const eventTypes = scenario.events.slice(0, 5).map((event) => event.type)

  assert.ok(['authentication', 'initial_access'].includes(eventTypes[0]))
  assert.deepEqual(eventTypes.slice(1), [
    'process_execution',
    'credential_access',
    'network_connection',
    'data_exfiltration',
  ])

  for (let index = 1; index < scenario.events.length; index += 1) {
    const previous = Date.parse(scenario.events[index - 1].timestamp)
    const current = Date.parse(scenario.events[index].timestamp)

    assert.ok(Number.isFinite(current))
    assert.ok(current >= previous)
  }
})

test.todo(
  'supports the minimum configuration of one user, one device, and five events',
)
test.todo('generates different scenario content for different seeds')
})
