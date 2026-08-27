const generateScenario = require('./generator')
const validateScenario = require('./scenarioValidator')
const {
  sequelize,
  Scenario,
  User,
  Device,
  Event,
} = require('./models')

const generateAndStoreScenario = async (scenarioId) => {
  try {
    const job = await Scenario.findByPk(scenarioId)

    if (!job) return

    await job.update({ status: 'running' })

    const generated = generateScenario({
      scenario: job.scenarioType,
      users: job.requestedUsers,
      devices: job.requestedDevices,
      events: job.requestedEvents,
      seed: job.seed,
    })

    const validation = validateScenario(generated, {
      users: job.requestedUsers,
      devices: job.requestedDevices,
      events: job.requestedEvents,
    })

    if (!validation.valid) {
      const messages = validation.errors.map((error) => error.message)
      throw new Error(`Generated scenario is invalid: ${messages.join('; ')}`)
    }

    await sequelize.transaction(async (transaction) => {
      const usersById = new Map()
      const devicesById = new Map()

      for (const generatedUser of generated.users) {
        const user = await User.create(
          {
            scenarioId,
            entityId: generatedUser.id,
            username: generatedUser.username,
            role: generatedUser.role,
          },
          { transaction },
        )

        usersById.set(generatedUser.id, user)
      }

      for (const generatedDevice of generated.devices) {
        const assignedUser = usersById.get(
          generatedDevice.assigned_user_id,
        )

        const device = await Device.create(
          {
            scenarioId,
            entityId: generatedDevice.id,
            hostname: generatedDevice.hostname,
            os: generatedDevice.os,
            assignedUserInternalId: assignedUser.internalId,
          },
          { transaction },
        )

        devicesById.set(generatedDevice.id, device)
      }

      const events = generated.events.map((generatedEvent) => ({
        scenarioId,
        entityId: generatedEvent.id,
        type: generatedEvent.type,
        timestamp: new Date(generatedEvent.timestamp),
        actorUserInternalId: usersById.get(
          generatedEvent.actor_user_id,
        ).internalId,
        deviceInternalId: devicesById.get(
          generatedEvent.device_id,
        ).internalId,
        details: generatedEvent.details,
      }))

      await Event.bulkCreate(events, {
        validate: true,
        transaction,
      })

      await job.update(
        { status: 'completed' },
        { transaction },
      )
    })
  } catch (error) {
    console.error(`Generation failed for ${scenarioId}:`, error)

    try {
      await Scenario.update(
        {
          status: 'failed',
          errorMessage: error.message,
        },
        { where: { id: scenarioId } },
      )
    } catch (updateError) {
      console.error(`Could not mark ${scenarioId} as failed:`, updateError)
    }
  }
}

const getCompletedScenario = async (job) => {
  const [users, devices, events] = await Promise.all([
    User.findAll({
      where: { scenarioId: job.id },
      order: [['entityId', 'ASC']],
    }),
    Device.findAll({
      where: { scenarioId: job.id },
      include: [{ model: User, as: 'assignedUser' }],
      order: [['entityId', 'ASC']],
    }),
    Event.findAll({
      where: { scenarioId: job.id },
      include: [
        { model: User, as: 'actorUser' },
        { model: Device, as: 'device' },
      ],
      order: [
        ['timestamp', 'ASC'],
        ['entityId', 'ASC'],
      ],
    }),
  ])

  return {
    metadata: {
      scenario: job.scenarioType,
      seed: job.seed,
      timeline_start: events[0]?.timestamp.toISOString(),
    },
    users: users.map((user) => ({
      id: user.entityId,
      username: user.username,
      role: user.role,
    })),
    devices: devices.map((device) => ({
      id: device.entityId,
      hostname: device.hostname,
      os: device.os,
      assigned_user_id: device.assignedUser.entityId,
    })),
    events: events.map((event) => ({
      id: event.entityId,
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      actor_user_id: event.actorUser.entityId,
      device_id: event.device.entityId,
      details: event.details,
    })),
  }
}

module.exports = {
  generateAndStoreScenario,
  getCompletedScenario,
}
