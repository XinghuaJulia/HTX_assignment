const express = require('express');
const app = express();
const generateScenario = require('./src/generator')

const result = generateScenario({
  scenario: 'credential_theft',
  users: 2,
  devices: 2,
  events: 25,
  seed: 42,
})

console.log("Generated scenario: %s", JSON.stringify(result, null, 2));

app.get('/health', (request, response) => {
  response.status(200).json({
    status: 'ok',
  })
});

app.post('/api/scenarios', (request, response) => {
    temp_id = "scenario-abc123";



    response.status(202).json({
        id: temp_id,
        status: 'pending',
    })
});

app.get('/api/scenarios/:id', (request, response) => {
    id = request.params.id;

    response.status(200).json({
        id: request.params.id,
        status: 'running',
    })
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});