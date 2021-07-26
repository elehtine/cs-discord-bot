const { reloadCommands } = require("../commands/utils");

const execute = async (client) => {
  await reloadCommands(client, ["join", "leave"]);
};

module.exports = {
  name: "COURSES_CHANGED",
  execute,
};