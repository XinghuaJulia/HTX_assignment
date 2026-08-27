const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  return sequelize.define(
    'User',
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
          notEmpty: {
            msg: 'User ID must not be empty',
          },
        },
      },

      username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Username must not be empty',
          },
          len: {
            args: [1, 100],
            msg: 'Username must not exceed 100 characters',
          },
        },
      },

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [[
              'employee',
              'administrator',
              'contractor',
            ]],
            msg: 'Invalid user role',
          },
        },
      },

      scenarioId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'scenario_id',
      },
    },
    {
      tableName: 'users',
      timestamps: false,

      indexes: [
        {
          unique: true,
          fields: ['scenario_id', 'entity_id'],
        },
        {
          unique: true,
          fields: ['scenario_id', 'username'],
        },
      ],
    },
  )
}