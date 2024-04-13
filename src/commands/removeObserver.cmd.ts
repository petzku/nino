import { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember, PermissionsBitField } from "discord.js";
import { generateAllowedMentions } from "../actions/generateAllowedMentions.action";
import { DatabaseData, Project, Task } from "../misc/types";
import { fail } from "../actions/fail.action";
import { Database } from "@firebase/database-types";
import { GetAlias } from "../actions/getalias.action";

export const RemoveObserverCmd = async (client: Client, db: Database, dbdata: DatabaseData, interaction: ChatInputCommandInteraction) => {
  if (!interaction.isCommand()) return;
  const { options, user, member, guildId } = interaction;
  if (guildId == null) return;

  await interaction.deferReply();

  const project = await GetAlias(db, dbdata, interaction, options.getString('project')!);
  const observingGuild = options.getString('guild')!;

  if (guildId == null || !(guildId in dbdata.guilds))
    return fail(`Guild ${guildId} does not exist.`, interaction);

  let projects = dbdata.guilds[guildId];

  if (!project || !(project in projects))
    return fail(`Project ${project} does not exist.`, interaction);
  if (projects[project].owner !== user!.id)
    return fail(`You do not have permission to do that.`, interaction);

  let success = false;
  for (let observerid in projects[project].observers) {
    const observer = projects[project].observers[observerid];
    if (observer.guildId == observingGuild) {
      success = true;
      db.ref(`/Projects/`).child(`${guildId}`).child(`${project}`).child('observers').child(observerid).remove();

      const ref = db.ref(`/Observers`).child(`${observingGuild}`);
      let data: {[key:string]:string[]} = {};
      data[guildId] = dbdata.observers[observingGuild][guildId].filter(o => o !== project);
      ref.update(data);
    }
  }

  if (!success) return fail('That observer does not exist!', interaction);

  const embed = new EmbedBuilder()
    .setTitle(`Project Modification`)
    .setDescription(`I removed the observer ${observingGuild} from \`${project}\` for you.`)
    .setColor(0xd797ff);
  await interaction.editReply({ embeds: [embed], allowedMentions: generateAllowedMentions([[], []]) });
}