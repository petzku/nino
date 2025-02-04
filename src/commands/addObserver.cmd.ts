import { ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember, PermissionsBitField } from "discord.js";
import { generateAllowedMentions } from "../actions/generateAllowedMentions.action";
import { DatabaseData, ObservedProject } from "../misc/types";
import { Database } from "@firebase/database-types";
import { GetAlias } from "../actions/getalias.action";
import { fail } from "../actions/fail.action";
import { t } from "i18next";

export const AddObserverCmd = async (client: Client, db: Database, dbdata: DatabaseData, interaction: ChatInputCommandInteraction) => {
  if (!interaction.isCommand()) return;
  const { options, member, guildId: observingGuildId, user, locale: lng } = interaction;
  if (observingGuildId == null) return;

  await interaction.deferReply();

  if (!(member as GuildMember)?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return fail(t('notAdmin', { lng }), interaction);
  }

  const originGuildId = options.getString('guild')!;
  const blame = options.getBoolean('blame')!;
  const updatesWH: string | null = options.getString('updates');
  const relesesWH: string | null = options.getString('releases');
  const alias = await GetAlias(db, dbdata, interaction, options.getString('project')!, originGuildId);

  if (!blame && !updatesWH && !relesesWH) {
    // no-op condition
    return await fail(t('observerNoOp', { lng }), interaction);
  }

  if (originGuildId == null || !(originGuildId in dbdata.guilds))
    return await fail(t('noSuchGuild', { lng, guildId: originGuildId }), interaction);
 
  let projects = dbdata.guilds[originGuildId];
    if (!alias || !(alias in projects))
      return await fail(t('noSuchProject', { lng }), interaction);

  const project = alias;

  db.ref(`/Projects/`).child(`${originGuildId}`).child(`${project}`).child('observers')
    .push({ guildId: observingGuildId, updatesWebhook: updatesWH, releasesWebhook: relesesWH, managerid: `${user.id}` });

  const nameAndBlame: ObservedProject = { name: project, blame };
  const ref = db.ref(`/Observers`).child(`${observingGuildId}`);
  if (dbdata.observers 
      && dbdata.observers[observingGuildId] 
      && dbdata.observers[observingGuildId][originGuildId]
    ) {
      let data: {[key:string]:ObservedProject[]} = {};
      data[originGuildId] = [...dbdata.observers[observingGuildId][originGuildId], nameAndBlame];
      ref.update(data);
    }
  else {
    let data: {[key:string]:ObservedProject[]} = {};
    data[originGuildId] = [nameAndBlame];
    ref.update(data)
  }

  const embed = new EmbedBuilder()
    .setTitle(t('projectModificationTitle', { lng }))
    .setDescription(t('addObserver', { lng, originGuildId, project }))
    .setColor(0xd797ff);
  
  (await interaction.editReply("OK")).delete(); // Remove any webhook URLs from the log
  await interaction.channel?.send({ embeds: [embed], allowedMentions: generateAllowedMentions([[], []]) });
}