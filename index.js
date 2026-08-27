const app = require('./src/app')
const { sequelize } = require('./src/models')

const PORT = process.env.PORT || 3000

const start = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync()

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Unable to start server:', error)
    process.exit(1)
  }
}

start()
