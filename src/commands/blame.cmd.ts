
import { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember } from "discord.js";
import { generateAllowedMentions } from "../actions/generateAllowedMentions.action";
import { DatabaseData } from "../misc/types";
import { Database } from "@firebase/database-types";
import { fail } from "../actions/fail.action";

export const BlameCmd = async (client: Client, db: Database, dbdata: DatabaseData, interaction: ChatInputCommandInteraction) => {
  if (!interaction.isCommand()) return;
  const { options, guildId } = interaction;

  await interaction.deferReply();

  const project = options.getString('project')!;
  let episode: number | null = options.getNumber('episode');
  let explain: boolean | null = options.getBoolean('explain');

  let epvalue;
  if (guildId == null || !(guildId in dbdata.guilds))
    return fail(`Guild ${guildId} does not exist.`, interaction);

  let projects = dbdata.guilds[guildId];
  if (!(project in projects))
    return fail(`Project ${project} does not exist.`, interaction);
  let status = '';
  let success = false;
  for (let ep in projects[project].episodes) {
    let projObj = projects[project].episodes[ep];
    if ((episode != null && projObj.number === episode) || (episode == null && projObj.done == false)) {
      success = true;
      episode = projObj.number;
      let map: {[key:string]:string} = {};
      if (explain != null && explain == true) {
        if (projects[project].keyStaff) Object.values(projects[project].keyStaff).forEach(ks => { map[ks.role.abbreviation] = ks.role.title; });
        if (projObj.additionalStaff) Object.values(projObj.additionalStaff).forEach(as => { map[as.role.abbreviation] = as.role.title });
      }
      for (let task in projects[project].episodes[ep].tasks) {
        let taskObj = projects[project].episodes[ep].tasks[task];
        if (taskObj.done) status += `~~${taskObj.abbreviation}~~ `;
        else status += `**${taskObj.abbreviation}** `;

        if (explain != null && explain == true) {
          let title = (taskObj.abbreviation in map) ? map[taskObj.abbreviation] : 'Unknown';
          status += `: ${title}\n`;
        }
      }
    }
  }

  if (!success)
    return fail('The project is complete, or the specified episode could not be found.', interaction);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${projects[project].title} (${projects[project].type})` })
    .setTitle(`Episode ${episode}`)
    .setThumbnail(projects[project].poster)
    .setDescription(status)
    .setColor(0xd797ff)
    .setTimestamp(Date.now());
  await interaction.editReply({ embeds: [embed], allowedMentions: generateAllowedMentions([[], []]) });

}