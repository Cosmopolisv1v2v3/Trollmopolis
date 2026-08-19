const { Events } = require('discord.js');
const { refreshCounter } = require('../lib/counter');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    refreshCounter(member.guild);
  },
};