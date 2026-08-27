const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const generateScenario = require('../src/generator')
const validateScenario = require('../src/scenarioValidator')

const config = {
  scenario: 'credential_theft',
  users: 2,
  devices: 2,
  events: 25,
  seed: 42,
}

const generatedScenario = () => generateScenario(config)

const errorCodes = (scenario) =>
  validateScenario(scenario, config).errors.map((error) => error.code)

describe('Scenario invariant validator', () => {
test('accepts a valid generated scenario', () => {
  assert.deepEqual(validateScenario(generatedScenario(), config), {
    valid: true,
    errors: [],
  })
})

test('accepts initial_access as the first attack-chain stage', () => {
  const scenario = generatedScenario()
  scenario.events[0].type = 'initial_access'

  assert.deepEqual(validateScenario(scenario, config), {
    valid: true,
    errors: [],
  })
})

test('detects incorrect entity and event counts', () => {
  const scenario = generatedScenario()
  scenario.users.pop()
  scenario.devices.pop()
  scenario.events.pop()

  const codes = errorCodes(scenario)

  assert.ok(codes.includes('user_count_mismatch'))
  assert.ok(codes.includes('device_count_mismatch'))
  assert.ok(codes.includes('event_count_mismatch'))
})

test('detects duplicate IDs across entity types', () => {
  const scenario = generatedScenario()
  scenario.devices[0].id = scenario.users[0].id

  assert.ok(errorCodes(scenario).includes('duplicate_id'))
})

test('detects invalid user and device references', () => {
  const scenario = generatedScenario()
  scenario.devices[0].assigned_user_id = 'user-999'
  scenario.events[0].actor_user_id = 'user-999'
  scenario.events[0].device_id = 'device-999'

  const codes = errorCodes(scenario)

  assert.ok(codes.includes('invalid_user_reference'))
  assert.ok(codes.includes('invalid_device_reference'))
})

test('detects invalid and unordered timestamps', () => {
  const invalidTimestamp = generatedScenario()
  invalidTimestamp.events[0].timestamp = 'not-a-date'
  assert.ok(errorCodes(invalidTimestamp).includes('invalid_timestamp'))

  const unordered = generatedScenario()
  unordered.events[1].timestamp = new Date(
    Date.parse(unordered.events[0].timestamp) - 60_000,
  ).toISOString()
  assert.ok(errorCodes(unordered).includes('events_not_chronological'))
})

test('detects missing required attack events', () => {
  const scenario = generatedScenario()
  scenario.events[4].type = 'authentication'

  assert.ok(errorCodes(scenario).includes('missing_required_event'))
})

test('detects incorrectly ordered attack-chain events', () => {
  const scenario = generatedScenario()
  const processEvent = scenario.events[1]
  scenario.events[1] = scenario.events[2]
  scenario.events[2] = processEvent

  assert.ok(errorCodes(scenario).includes('invalid_attack_chain_order'))
})

test.todo(
  'detects a missing initial-access stage when no equivalent event exists',
)
test.todo('reports all the violationsin one validation result')
})
