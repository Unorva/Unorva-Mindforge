import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Reads the configured development datasource without printing its credentials. Run inspection before applying the
 * checked-in, additive schema scripts.
 */
public final class DatabaseMaintenance {

    private DatabaseMaintenance() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            throw new IllegalArgumentException(
                    "Usage: DatabaseMaintenance <application-dev.yml> inspect|apply|cleanup-smoke [sql ...|suffix]");
        }
        Map<?, ?> config;
        try (InputStream input = Files.newInputStream(Path.of(args[0]))) {
            config = new Yaml().load(input);
        }
        Map<?, ?> spring = (Map<?, ?>) config.get("spring");
        Map<?, ?> datasource = (Map<?, ?>) spring.get("datasource");
        String url = String.valueOf(datasource.get("url"));
        String username = String.valueOf(datasource.get("username"));
        String password = String.valueOf(datasource.get("password"));
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            if ("inspect".equals(args[1])) {
                inspect(connection);
            } else if ("apply".equals(args[1]) && args.length > 2) {
                for (int index = 2; index < args.length; index++) {
                    apply(connection, Path.of(args[index]));
                }
                inspect(connection);
            } else if ("cleanup-smoke".equals(args[1]) && args.length == 3) {
                cleanupSmoke(connection, args[2]);
                inspect(connection);
            } else {
                throw new IllegalArgumentException(
                        "Expected inspect, apply with SQL files, or cleanup-smoke with a test suffix");
            }
        }
    }

    /** Removes only the two uniquely named accounts created by smoke_workspace.py. */
    private static void cleanupSmoke(Connection connection, String suffix) throws Exception {
        if (!"mind_forge".equals(connection.getCatalog()) || !suffix.matches("[0-9]{14}[a-f0-9]{6}")) {
            throw new IllegalArgumentException("Cleanup requires the mind_forge schema and an exact smoke-test suffix");
        }
        List<Long> userIds = new ArrayList<>();
        try (PreparedStatement query = connection.prepareStatement("SELECT id FROM `user` WHERE email IN (?, ?)")) {
            query.setString(1, "codex-smoke-" + suffix + "-1@example.invalid");
            query.setString(2, "codex-smoke-" + suffix + "-2@example.invalid");
            try (ResultSet rows = query.executeQuery()) {
                while (rows.next()) {
                    userIds.add(rows.getLong(1));
                }
            }
        }
        connection.setAutoCommit(false);
        try {
            for (Long userId : userIds) {
                deleteOwnedRows(
                        connection,
                        "DELETE FROM project_defect WHERE project_id IN (SELECT id FROM project WHERE user_id = ?)",
                        userId);
                deleteOwnedRows(
                        connection,
                        "DELETE FROM project_requirement WHERE project_id IN (SELECT id FROM project WHERE user_id = ?)",
                        userId);
                for (String table :
                        List.of(
                                "mf_ai_message",
                                "mf_ai_conversation",
                                "mf_ai_credential",
                                "mf_mail_remote",
                                "mf_mail",
                                "mf_mail_account",
                                "mf_email_binding",
                                "mf_finance_transaction",
                                "mf_finance_budget",
                                "mf_finance_account",
                                "mf_blog_comment",
                                "mf_blog_post",
                                "mf_note",
                                "mf_note_folder",
                                "mf_business_lock",
                                "mf_user_setting",
                                "daily_review",
                                "project")) {
                    deleteOwnedRows(connection, "DELETE FROM `" + table + "` WHERE user_id = ?", userId);
                }
                deleteOwnedRows(connection, "DELETE FROM `user` WHERE id = ?", userId);
            }
            connection.commit();
            System.out.println("Removed " + userIds.size() + " isolated smoke-test users and their fixtures");
        } catch (Exception exception) {
            connection.rollback();
            throw exception;
        } finally {
            connection.setAutoCommit(true);
        }
    }

    private static void deleteOwnedRows(Connection connection, String sql, long userId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            statement.executeUpdate();
        }
    }

    private static void inspect(Connection connection) throws Exception {
        System.out.println("Connected schema: " + connection.getCatalog());
        try (Statement statement = connection.createStatement();
                ResultSet tables =
                        statement.executeQuery(
                                "SELECT table_schema, table_name FROM information_schema.tables "
                                        + "WHERE table_schema IN ('mind_forge', 'project_manager') ORDER BY table_schema, table_name")) {
            while (tables.next()) {
                String schema = tables.getString(1);
                String table = tables.getString(2);
                try (Statement detail = connection.createStatement();
                        ResultSet count =
                                detail.executeQuery("SELECT COUNT(*) FROM `" + schema + "`.`" + table + "`")) {
                    count.next();
                    System.out.println(schema + "." + table + " rows=" + count.getLong(1));
                }
                try (ResultSet columns = connection.getMetaData().getColumns(schema, null, table, null)) {
                    StringBuilder names = new StringBuilder("  columns: ");
                    while (columns.next()) {
                        names.append(columns.getString("COLUMN_NAME")).append(' ');
                    }
                    System.out.println(names);
                }
            }
        }
    }

    private static void apply(Connection connection, Path path) throws Exception {
        String sql = Files.readString(path, StandardCharsets.UTF_8).replaceAll("(?m)^\\s*(--|#).*?$", "");
        int count = 0;
        for (String fragment : splitStatements(sql)) {
            String command = fragment.trim();
            if (command.isEmpty()) {
                continue;
            }
            if (command.matches(
                    "(?is)^ALTER\\s+TABLE\\s+mf_mail\\s+ADD\\s+COLUMN\\s+account_id\\s+BIGINT\\s+NULL\\s+COMMENT\\s+'Connected mailbox; NULL for standalone local drafts'\\s+AFTER\\s+user_id$")) {
                try (ResultSet columns =
                        connection.getMetaData().getColumns(connection.getCatalog(), null, "mf_mail", "account_id")) {
                    if (columns.next()) {
                        continue;
                    }
                }
            } else if (command.matches(
                    "(?is)^ALTER\\s+TABLE\\s+mf_mail\\s+ADD\\s+COLUMN\\s+send_attempt_token\\s+VARCHAR\\s*\\(36\\)\\s+NULL$")) {
                try (ResultSet columns =
                        connection
                                .getMetaData()
                                .getColumns(connection.getCatalog(), null, "mf_mail", "send_attempt_token")) {
                    if (columns.next()) {
                        continue;
                    }
                }
            } else if (command.matches(
                    "(?is)^ALTER\\s+TABLE\\s+mf_mail\\s+ADD\\s+COLUMN\\s+flags_version\\s+BIGINT\\s+NOT\\s+NULL\\s+DEFAULT\\s+0$")) {
                try (ResultSet columns =
                        connection
                                .getMetaData()
                                .getColumns(connection.getCatalog(), null, "mf_mail", "flags_version")) {
                    if (columns.next()) {
                        continue;
                    }
                }
            } else if (command.matches(
                    "(?is)^ALTER\\s+TABLE\\s+mf_user_setting\\s+ADD\\s+COLUMN\\s+appearance_json\\s+TEXT\\s+NULL\\s+COMMENT\\s+'Workspace background preferences'$")) {
                try (ResultSet columns =
                        connection
                                .getMetaData()
                                .getColumns(connection.getCatalog(), null, "mf_user_setting", "appearance_json")) {
                    if (columns.next()) {
                        continue;
                    }
                }
            } else if (command.matches(
                    "(?is)^CREATE\\s+INDEX\\s+idx_mail_user_account\\s+ON\\s+mf_mail\\s*\\(\\s*user_id\\s*,\\s*account_id\\s*,\\s*updated_at\\s*\\)$")) {
                boolean exists = false;
                try (ResultSet indexes =
                        connection.getMetaData().getIndexInfo(connection.getCatalog(), null, "mf_mail", false, false)) {
                    while (indexes.next()) {
                        if ("idx_mail_user_account".equalsIgnoreCase(indexes.getString("INDEX_NAME"))) {
                            exists = true;
                            break;
                        }
                    }
                }
                if (exists) {
                    continue;
                }
            } else if (!command.matches(
                    "(?is)^(CREATE\\s+(TABLE|DATABASE)\\s+IF\\s+NOT\\s+EXISTS|USE\\s+mind_forge).*")) {
                throw new IllegalArgumentException("Only additive DDL is accepted: " + path.getFileName());
            }
            try (Statement statement = connection.createStatement()) {
                statement.execute(command);
                count++;
            }
        }
        System.out.println("Applied " + path.getFileName() + ": " + count + " additive statements");
    }

    private static List<String> splitStatements(String sql) {
        List<String> statements = new ArrayList<>();
        StringBuilder statement = new StringBuilder();
        char quote = 0;
        boolean escaped = false;
        for (char character : sql.toCharArray()) {
            if (quote != 0) {
                statement.append(character);
                if (!escaped && character == quote) {
                    quote = 0;
                }
                escaped = !escaped && character == '\\';
            } else if (character == '\'' || character == '"' || character == '`') {
                quote = character;
                statement.append(character);
            } else if (character == ';') {
                statements.add(statement.toString());
                statement.setLength(0);
            } else {
                statement.append(character);
            }
        }
        if (quote != 0) {
            throw new IllegalArgumentException("Unterminated SQL quote");
        }
        statements.add(statement.toString());
        return statements;
    }
}
