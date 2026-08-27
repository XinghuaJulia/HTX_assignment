const ATTACK_CHAIN_STAGES = [
  {
    name: 'authentication_or_initial_access',
    eventTypes: ['authentication', 'initial_access'],
  },
  { name: 'process_execution', eventTypes: ['process_execution'] },
  { name: 'credential_access', eventTypes: ['credential_access'] },
  { name: 'network_connection', eventTypes: ['network_connection'] },
  { name: 'data_exfiltration', eventTypes: ['data_exfiltration'] },
]

const validateScenario = (scenario, config) => {
  const errors = []
  const addError = (code, message, context = {}) => {
    errors.push({ code, message, ...context })
  }

  const users = Array.isArray(scenario?.users) ? scenario.users : []
  const devices = Array.isArray(scenario?.devices) ? scenario.devices : []
  const events = Array.isArray(scenario?.events) ? scenario.events : []

  if (!Array.isArray(scenario?.users)) {
    addError('invalid_users', 'users must be an array')
  } else if (users.length !== config.users) {
    addError(
      'user_count_mismatch',
      `Expected ${config.users} users but generated ${users.length}`,
    )
  }

  if (!Array.isArray(scenario?.devices)) {
    addError('invalid_devices', 'devices must be an array')
  } else if (devices.length !== config.devices) {
    addError(
      'device_count_mismatch',
      `Expected ${config.devices} devices but generated ${devices.length}`,
    )
  }

  if (!Array.isArray(scenario?.events)) {
    addError('invalid_events', 'events must be an array')
  } else if (events.length !== config.events) {
    addError(
      'event_count_mismatch',
      `Expected ${config.events} events but generated ${events.length}`,
    )
  }

  const seenIds = new Set()
  for (const [entityType, entities] of [
    ['user', users],
    ['device', devices],
    ['event', events],
  ]) {
    for (const entity of entities) {
      if (typeof entity?.id !== 'string' || entity.id.length === 0) {
        addError('invalid_id', `${entityType} has an invalid ID`, {
          entity_type: entityType,
        })
      } else if (seenIds.has(entity.id)) {
        addError('duplicate_id', `Duplicate ID: ${entity.id}`, {
          entity_id: entity.id,
        })
      } else {
        seenIds.add(entity.id)
      }
    }
  }

  const userIds = new Set(
    users.map((user) => user?.id).filter((id) => typeof id === 'string'),
  )
  const deviceIds = new Set(
    devices.map((device) => device?.id).filter((id) => typeof id === 'string'),
  )

  for (const device of devices) {
    if (
      device?.assigned_user_id != null &&
      !userIds.has(device.assigned_user_id)
    ) {
      addError(
        'invalid_user_reference',
        `${device.id} references unknown user ${device.assigned_user_id}`,
        { device_id: device.id },
      )
    }
  }

  let previousTimestamp = null
  for (const event of events) {
    if (
      event?.actor_user_id != null &&
      !userIds.has(event.actor_user_id)
    ) {
      addError(
        'invalid_user_reference',
        `${event.id} references unknown user ${event.actor_user_id}`,
        { event_id: event.id },
      )
    }

    if (event?.device_id != null && !deviceIds.has(event.device_id)) {
      addError(
        'invalid_device_reference',
        `${event.id} references unknown device ${event.device_id}`,
        { event_id: event.id },
      )
    }

    const timestamp = Date.parse(event?.timestamp)
    if (Number.isNaN(timestamp)) {
      addError(
        'invalid_timestamp',
        `${event.id} has an invalid timestamp`,
        { event_id: event.id },
      )
      continue
    }

    if (previousTimestamp !== null && timestamp < previousTimestamp) {
      addError(
        'events_not_chronological',
        `${event.id} occurs before the preceding event`,
        { event_id: event.id },
      )
    }

    previousTimestamp = timestamp
  }

  const eventIndexes = new Map()
  for (const stage of ATTACK_CHAIN_STAGES) {
    const index = events.findIndex((event) =>
      stage.eventTypes.includes(event?.type),
    )

    if (index === -1) {
      addError(
        'missing_required_event',
        `Missing required event stage: ${stage.name}`,
        { event_type: stage.name },
      )
    } else {
      eventIndexes.set(stage.name, index)
    }
  }

  for (let index = 1; index < ATTACK_CHAIN_STAGES.length; index += 1) {
    const previousType = ATTACK_CHAIN_STAGES[index - 1].name
    const currentType = ATTACK_CHAIN_STAGES[index].name

    if (
      eventIndexes.has(previousType) &&
      eventIndexes.has(currentType) &&
      eventIndexes.get(previousType) >= eventIndexes.get(currentType)
    ) {
      addError(
        'invalid_attack_chain_order',
        `${currentType} must occur after ${previousType}`,
        { event_type: currentType },
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

module.exports = validateScenario
