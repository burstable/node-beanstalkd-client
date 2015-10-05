## Install pre-commit hook
The hook will lint and test all code before committed:

`$ cp pre-commit .git/hooks/pre-commit`

## Integration tests

Run `npm run build-docker` the first time or any time you change dependencies.
After the first build you can simply run `npm run test-integration` and it will run integration tests inside the already built docker image.

Integration tests should be few and only for ensuring the overall beanstalkd communications work as intended. Rely on unit tests and coverage for productivity.
