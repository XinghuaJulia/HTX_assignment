const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  return sequelize.define(
    'Device',
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

      hostname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
      },

      os: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [['Windows', 'Linux', 'macOS']],
            msg: 'Unsupported operating system',
          },
        },
      },

      scenarioId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'scenario_id',
      },

      assignedUserInternalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_user_id',
      },
    },
    {
      tableName: 'devices',
      timestamps: false,

      indexes: [
        {
          unique: true,
          fields: ['scenario_id', 'entity_id'],
        },
        {
          unique: true,
          fields: ['scenario_id', 'hostname'],
        },
      ],
    },
  )
}