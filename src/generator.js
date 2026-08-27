const ATTACK_CHAIN = [
  {
    stage: 'authentication_or_initial_access',
    eventType: 'authentication',
  },
  { stage: 'process_execution', eventType: 'process_execution' },
  { stage: 'credential_access', eventType: 'credential_access' },
  { stage: 'network_connection', eventType: 'network_connection' },
  { stage: 'data_exfiltration', eventType: 'data_exfiltration' },
]

const USERNAMES = ['alex', 'jamie', 'morgan', 'riley', 'sam']
const ROLES = ['employee', 'administrator', 'contractor']
const OPERATING_SYSTEMS = ['Windows', 'Linux', 'macOS']
const BACKGROUND_EVENT_TYPES = [
  'authentication',
  'process_execution',
  'network_connection',
]

const createRandom = (seed) => {
  let state = Number(BigInt(seed) & 0xffffffffn)

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  return {
    integer: (minimum, maximum) =>
      Math.floor(next() * (maximum - minimum + 1)) + minimum,
    pick: (values) => values[Math.floor(next() * values.length)],
  }
}

const formatId = (prefix, index) =>
  `${prefix}-${String(index + 1).padStart(3, '0')}`

const eventDetails = (type, random, isAttackEvent) => {
  if (!isAttackEvent) {
    const backgroundDetails = {
      authentication: () => ({
        activity: 'background',
        result: 'success',
      }),
      process_execution: () => ({
        activity: 'background',
        process: 'browser.exe',
      }),
      network_connection: () => ({
        activity: 'background',
        destination_ip: `192.0.2.${random.integer(1, 254)}`,
        destination_port: 443,
        protocol: 'tcp',
      }),
    }

    return backgroundDetails[type]()
  }

  const details = {
    authentication: () => ({
      result: 'success',
      source_ip: `198.51.100.${random.integer(1, 254)}`,
    }),
    process_execution: () => ({
      process: 'powershell.exe',
      parent_process: 'explorer.exe',
    }),
    credential_access: () => ({
      method: 'browser_credential_store',
    }),
    network_connection: () => ({
      destination_ip: `203.0.113.${random.integer(1, 254)}`,
      destination_port: 443,
      protocol: 'tcp',
    }),
    data_exfiltration: () => ({
      channel: 'https',
      bytes_sent: random.integer(50_000, 5_000_000),
    }),
  }

  return details[type]()
}

const generateScenario = (config) => {
  const random = createRandom(config.seed)

  const users = Array.from({ length: config.users }, (_, index) => ({
    id: formatId('user', index),
    username: `${random.pick(USERNAMES)}${String(index + 1).padStart(3, '0')}`,
    role: random.pick(ROLES),
  }))

  const devices = Array.from({ length: config.devices }, (_, index) => ({
    id: formatId('device', index),
    hostname: `WORKSTATION-${String(index + 1).padStart(3, '0')}`,
    os: random.pick(OPERATING_SYSTEMS),
    assigned_user_id: users[index % users.length].id,
  }))

  const attackDevice = random.pick(devices)
  const attackUserId = attackDevice.assigned_user_id
  const startTime =
    Date.UTC(2025, 0, 1) + random.integer(0, 365 * 24 * 60 - 1) * 60_000

  let timestamp = startTime
  const events = Array.from({ length: config.events }, (_, index) => {
    const isAttackEvent = index < ATTACK_CHAIN.length
    const attackStep = ATTACK_CHAIN[index]
    const type = isAttackEvent
      ? attackStep.eventType
      : random.pick(BACKGROUND_EVENT_TYPES)
    const device = isAttackEvent ? attackDevice : random.pick(devices)
    const details = eventDetails(type, random, isAttackEvent)

    if (isAttackEvent) {
      details.attack_stage = attackStep.stage
      details.attack_sequence = index + 1
    }

    const event = {
      id: formatId('event', index),
      type,
      timestamp: new Date(timestamp).toISOString(),
      actor_user_id: isAttackEvent
        ? attackUserId
        : device.assigned_user_id,
      device_id: device.id,
      details,
    }

    timestamp += random.integer(1, 10) * 60_000
    return event
  })

  return {
    metadata: {
      scenario: config.scenario,
      seed: config.seed,
      timeline_start: new Date(startTime).toISOString(),
    },
    ground_truth: {
      attack_chain: ATTACK_CHAIN.map((step, index) => ({
        sequence: index + 1,
        stage: step.stage,
        event_type: step.eventType,
        event_id: formatId('event', index),
      })),
    },
    users,
    devices,
    events,
  }
}

module.exports = generateScenario
