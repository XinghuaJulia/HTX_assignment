const sequelize = require('../database')

const Scenario = require('./scenario')(sequelize)
const User = require('./user')(sequelize)
const Device = require('./device')(sequelize)
const Event = require('./event')(sequelize)

Scenario.hasMany(User, {
  foreignKey: 'scenarioId',
  as: 'users',
  onDelete: 'CASCADE',
})

User.belongsTo(Scenario, {
  foreignKey: 'scenarioId',
  as: 'scenario',
})

Scenario.hasMany(Device, {
  foreignKey: 'scenarioId',
  as: 'devices',
  onDelete: 'CASCADE',
})

Device.belongsTo(Scenario, {
  foreignKey: 'scenarioId',
  as: 'scenario',
})

Scenario.hasMany(Event, {
  foreignKey: 'scenarioId',
  as: 'events',
  onDelete: 'CASCADE',
})

Event.belongsTo(Scenario, {
  foreignKey: 'scenarioId',
  as: 'scenario',
})

Device.belongsTo(User, {
  foreignKey: 'assignedUserInternalId',
  as: 'assignedUser',
})

User.hasMany(Device, {
  foreignKey: 'assignedUserInternalId',
  as: 'assignedDevices',
})

Event.belongsTo(User, {
  foreignKey: 'actorUserInternalId',
  as: 'actorUser',
})

User.hasMany(Event, {
  foreignKey: 'actorUserInternalId',
  as: 'events',
})

Event.belongsTo(Device, {
  foreignKey: 'deviceInternalId',
  as: 'device',
})

Device.hasMany(Event, {
  foreignKey: 'deviceInternalId',
  as: 'events',
})

module.exports = {
  sequelize,
  Scenario,
  User,
  Device,
  Event,
}