const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'scenarios.sqlite',
  logging: true,
})

module.exports = sequelize