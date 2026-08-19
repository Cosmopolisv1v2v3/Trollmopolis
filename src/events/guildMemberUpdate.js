const { Events } = require('discord.js');
const { syncMemberStaff } = require('../lib/staff');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      if (newMember.partial) await newMember.fetch();
    } catch {
      return; // no cacheado y no se pudo resolver
    }
    await syncMemberStaff(newMember);
  },
};