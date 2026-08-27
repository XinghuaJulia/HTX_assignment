# Development Assistant
I only used OpenAI Codex because I have a subscription for that and I think it is more suitable for coding than Gemini.


Codex helped me brainstorm the optional extensions, compare tech stacks, storage options. It also helped draft and review parts of the generator, API, invariant validation, and my documentation.

I initially wanted to use Mongoose because I am most familiar with it, it has nice schema and model syntax. So I then searched online and discovered that Mongoose will require a MongoDB server. I then verified with Codex how to do that and thought about how inconvenient it would be from the user's perspective, having to start up a database server before running this project. Then, I searched online for other alternatives, Zod or Yup, and asked Codex to compare them to Mongoose. Codex replied that yes, it is good for validation for does not have persistence. Thus, I eventually settled with the suggested SQLite solution in the assessment file. Coupled with AI's input that I should use Sequelize node package as an Object Relational Mapping.

One AI-assisted assumption I rejected was during the testing, where the first attack-chain event must always be `authentication`. I checked the assessment wording and changed the validator and tests to accept either `authentication` or `initial_access`.

I verified the result by reviewing each model and endpoint, manually calling the REST API, running the automated tests, comparing repeated fixed-seed output, and deliberately changing generated scenarios to confirm that the independent validator catches count, ID, reference, timestamp, required-events.
