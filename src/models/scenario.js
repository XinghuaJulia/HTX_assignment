const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  return sequelize.define(
    'Scenario',
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },

      scenarioType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'scenario_type',
        validate: {
          isIn: {
            args: [['credential_theft']],
            msg: 'scenario can only be credential_theft',
          },
        },
      },

      requestedUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_users',
        validate: {
          isInteger(value) {
            if (!Number.isInteger(value)) {
              throw new Error('users must be an integer')
            }
          },
          min: 1,
          max: 100,
        },
      },

      requestedDevices: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_devices',
        validate: {
          isInteger(value) {
            if (!Number.isInteger(value)) {
              throw new Error('devices must be an integer')
            }
          },
          min: 1,
          max: 100,
        },
      },

      requestedEvents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_events',
        validate: {
          isInteger(value) {
            if (!Number.isInteger(value)) {
              throw new Error('events must be an integer')
            }
          },
          min: 5,
          max: 10_000,
        },
      },

      seed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isSafeInteger(value) {
            if (!Number.isSafeInteger(value)) {
              throw new Error('seed must be a safe integer')
            }
          },
        },
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [[
              'pending',
              'running',
              'completed',
              'failed',
            ]],
            msg: 'Status can only be: pending, running, completed, failed',
          },
        },
      },

      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'error_message',
      },
    },
    {
      tableName: 'scenarios',
      timestamps: true,
    },
  )
}
