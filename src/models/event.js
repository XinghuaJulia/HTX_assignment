const { DataTypes } = require('sequelize')

const EVENT_TYPES = [
  'authentication',
  'initial_access',
  'process_execution',
  'credential_access',
  'network_connection',
  'data_exfiltration',
]

module.exports = (sequelize) => {
  return sequelize.define(
    'Event',
    {
      internalId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },

      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'entity_id',
        validate: {
          notEmpty: true,
        },
      },

      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [EVENT_TYPES],
            msg: 'Unsupported event type',
          },
        },
      },

      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isValidTimestamp(value) {
            if (Number.isNaN(new Date(value).getTime())) {
              throw new Error('Event timestamp is not a valid date')
            }
          },
        },
      },

      details: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        validate: {
          isObject(value) {
            if (
              value === null ||
              typeof value !== 'object' ||
              Array.isArray(value)
            ) {
              throw new Error('Event details must be an object')
            }
          },
        },
      },

      scenarioId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'scenario_id',
      },

      actorUserInternalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'actor_user_id',
      },

      deviceInternalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'device_id',
      },
    },
    {
      tableName: 'events',
      timestamps: false,

      indexes: [
        {
          unique: true,
          fields: ['scenario_id', 'entity_id'],
        },
        {
          fields: ['scenario_id', 'timestamp'],
        },
      ],
    },
  )
}