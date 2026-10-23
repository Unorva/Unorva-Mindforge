package com.unorva.mindforge.module.business.mail.dao;

import static org.junit.jupiter.api.Assertions.*;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Parse the actual XML and inspect bound SQL for critical owner and send-token contracts. */
class MailDaoXmlTest {
    @Test
    void incrementalCacheIsOwnerScopedAndDoesNotTransferRichBodies() throws Exception {
        var query =
                sql(
                        parse("Mail")
                                .getMappedStatement(MailDao.class.getName() + ".selectSyncCache")
                                .getBoundSql(Map.of("userId", 7L, "accountId", 3L)));
        assertTrue(query.startsWith("SELECT remote.uid_validity AS uidValidity, remote.remote_uid AS uid"));
        assertTrue(
                query.contains(
                        "mail.id = remote.mail_id AND mail.user_id = remote.user_id AND mail.account_id = remote.account_id"));
        assertTrue(
                query.contains(
                        "WHERE remote.user_id = ? AND remote.account_id = ? AND remote.remote_folder = 'INBOX'"));
        assertTrue(query.contains("LIMIT 200"));
        assertTrue(query.contains("mail.body IS NOT NULL"));
        assertFalse(query.contains("TRIM(mail.body)"), "Empty provider messages must remain cached");
        assertFalse(query.substring(0, query.indexOf(" FROM ")).contains("html_body"));
        String syncState =
                sql(
                        parse("Mail")
                                .getMappedStatement(MailDao.class.getName() + ".selectSyncState")
                                .getBoundSql(Map.of("userId", 7L, "id", 11L)));
        assertFalse(syncState.contains("html_body"));
        assertTrue(syncState.contains("WHERE user_id = ? AND id = ?"));
    }

    @Test
    void unreadCountOnlyIncludesOwnedInboxFromEnabledConfiguredAccounts() throws Exception {
        Configuration configuration = parse("Mail");
        BoundSql count =
                configuration
                        .getMappedStatement(MailDao.class.getName() + ".countUnreadInbox")
                        .getBoundSql(Map.of("userId", 7L));
        String query = sql(count);
        assertTrue(query.startsWith("SELECT COUNT(*) FROM mf_mail mail"));
        assertTrue(query.contains("account.id = mail.account_id AND account.user_id = mail.user_id"));
        assertTrue(query.contains("WHERE mail.user_id = ? AND mail.folder = 'inbox' AND mail.unread = TRUE"));
        assertTrue(query.contains("account.enabled = TRUE"));
        assertTrue(query.contains("account.password_ciphertext IS NOT NULL"));
        assertTrue(query.contains("TRIM(account.password_ciphertext) != ''"));
        assertEquals(1, count.getParameterMappings().size());
        assertEquals("userId", count.getParameterMappings().getFirst().getProperty());
        assertFalse(query.contains("LIMIT"), "Unread counts must include messages beyond the list limit");
        assertFalse(query.contains("html_body"));
    }

    @Test
    void mailQueriesKeepOwnerFilteringAndTokenCompareAndSet() throws Exception {
        Configuration configuration = parse("Mail");
        String prefix = MailDao.class.getName() + ".";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("userId", 7L);
        parameters.put("accountId", 3L);
        BoundSql scoped = configuration.getMappedStatement(prefix + "listOwned").getBoundSql(parameters);
        assertTrue(sql(scoped).contains("user_id = ? AND account_id = ?"));
        assertTrue(sql(scoped).contains("ORDER BY created_at DESC, id DESC"));
        assertFalse(sql(scoped).contains("ORDER BY updated_at"));
        assertFalse(sql(scoped).contains("html_body"), "The list must not load embedded base64 image payloads");
        parameters.put("accountId", null);
        BoundSql allAccounts = configuration.getMappedStatement(prefix + "listOwned").getBoundSql(parameters);
        assertTrue(sql(allAccounts).contains("WHERE user_id = ?"));
        assertFalse(sql(allAccounts).contains("AND account_id = ?"));
        parameters.put("id", 11L);
        parameters.put("attemptToken", "token");
        parameters.put("folder", "sent");
        BoundSql completion = configuration.getMappedStatement(prefix + "finishSend").getBoundSql(parameters);
        assertTrue(
                sql(completion)
                        .contains(
                                "WHERE user_id = ? AND id = ? AND folder = 'sending' AND" + " send_attempt_token = ?"));
        assertTrue(
                completion.getParameterMappings().stream()
                        .anyMatch(parameter -> parameter.getProperty().equals("attemptToken")));
        MappedStatement insert = configuration.getMappedStatement(prefix + "insertOwned");
        assertArrayEquals(new String[] {"entity.id"}, insert.getKeyProperties());
        parameters.put("starred", true);
        parameters.put("unread", null);
        String flagChange = sql(configuration.getMappedStatement(prefix + "patchOwned").getBoundSql(parameters));
        assertTrue(flagChange.contains("flags_version = flags_version + 1"));
        parameters.put("starred", null);
        String folderOnly = sql(configuration.getMappedStatement(prefix + "patchOwned").getBoundSql(parameters));
        assertFalse(folderOnly.contains("flags_version + 1"));
        parameters.put("accountId", 3L);
        String snapshot = sql(configuration.getMappedStatement(prefix + "selectFlagVersions").getBoundSql(parameters));
        assertTrue(snapshot.contains("WHERE user_id = ? AND account_id = ?"));
        assertFalse(snapshot.contains("body"));
        String recovery = sql(configuration.getMappedStatement(prefix + "recover").getBoundSql(parameters));
        assertTrue(recovery.contains("WHERE user_id = ? AND id = ? AND folder = 'sending'"));
        assertTrue(recovery.contains("updated_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)"));
        String detail = sql(configuration.getMappedStatement(prefix + "selectOwned").getBoundSql(parameters));
        assertTrue(detail.contains("WHERE user_id = ? AND id = ?"));
        parameters.put("entity", new com.unorva.mindforge.module.business.mail.domain.entity.MailEntity());
        String refresh = sql(configuration.getMappedStatement(prefix + "refreshRemote").getBoundSql(parameters));
        assertFalse(refresh.contains("folder ="));
        assertFalse(refresh.contains("created_at ="));
        assertFalse(refresh.contains("flags_version ="));
    }

    @Test
    void remoteQueriesUseCompositeIdentityAndPreserveDeletedTombstones() throws Exception {
        Configuration configuration = parse("MailRemote");
        Map<String, Object> parameters = Map.of("userId", 7L, "accountId", 3L, "validity", 5L, "uid", 1L, "id", 11L);
        String prefix = MailRemoteDao.class.getName() + ".";
        String identity = sql(configuration.getMappedStatement(prefix + "selectIdentity").getBoundSql(parameters));
        assertTrue(
                identity.contains(
                        "user_id = ? AND account_id = ? AND remote_folder = 'INBOX' AND"
                                + " uid_validity = ? AND remote_uid = ?"));
        String deletion = sql(configuration.getMappedStatement(prefix + "tombstone").getBoundSql(parameters));
        assertTrue(deletion.contains("SET mail_id = NULL WHERE user_id = ? AND mail_id = ?"));
        // The account mapper must also load successfully with generated keys on its insert.
        Configuration accounts = parse("MailAccount");
        assertArrayEquals(
                new String[] {"entity.id"},
                accounts.getMappedStatement(MailAccountDao.class.getName() + ".insertOwned").getKeyProperties());
    }

    private static Configuration parse(String name) throws Exception {
        String resource = "mapper/business/mail/" + name + "Mapper.xml";
        Configuration configuration = new Configuration();
        try (InputStream stream = MailDaoXmlTest.class.getClassLoader().getResourceAsStream(resource)) {
            assertNotNull(stream, resource);
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private static String sql(BoundSql sql) {
        return sql.getSql().replaceAll("\\s+", " ").trim();
    }
}
