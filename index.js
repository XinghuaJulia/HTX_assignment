const express = require('express');
const app = express();

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