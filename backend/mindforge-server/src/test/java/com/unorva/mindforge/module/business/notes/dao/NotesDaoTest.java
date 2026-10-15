package com.unorva.mindforge.module.business.notes.dao;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.executor.Executor;
import org.apache.ibatis.executor.resultset.DefaultResultSetHandler;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.session.RowBounds;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/** Verifies the actual XML record mapping and owner-scoped SQL contracts. */
class NotesDaoTest {

    @Test
    void listAndSingleNoteUseEquivalentFieldMappingsForTheSameOwner() throws Exception {
        Configuration configuration =
                load("mapper/business/notes/NoteMapper.xml", "mapper/business/notes/NoteFolderMapper.xml");
        LocalDateTime updatedAt = LocalDateTime.of(2026, 10, 9, 12, 30);
        var values =
                row(
                        "id",
                        11L,
                        "title",
                        "笔记",
                        "content",
                        "# 原有 Markdown\n内容",
                        "color",
                        "primary",
                        "folder_id",
                        "work",
                        "updated_at",
                        updatedAt,
                        "deleted",
                        true);
        NoteVO expected = new NoteVO(11L, "笔记", "# 原有 Markdown\n内容", "primary", "work", updatedAt, true);
        String namespace = "com.unorva.mindforge.module.business.notes.dao.NoteDao.";
        assertEquals(List.of(expected), map(configuration, namespace + "listNotes", Map.of("userId", 7L), values));
        assertEquals(
                List.of(expected), map(configuration, namespace + "findNote", Map.of("userId", 7L, "id", 11L), values));
    }

    @Test
    void noteInsertUsesGeneratedKeyAndFolderWritesBindBothPartsOfTheOwnerKey() throws Exception {
        Configuration configuration =
                load("mapper/business/notes/NoteMapper.xml", "mapper/business/notes/NoteFolderMapper.xml");
        var insert =
                configuration.getMappedStatement("com.unorva.mindforge.module.business.notes.dao.NoteDao.insertNote");
        assertArrayEquals(new String[] {"entity.id"}, insert.getKeyProperties());
        var delete =
                configuration.getMappedStatement(
                        "com.unorva.mindforge.module.business.notes.dao.NoteFolderDao.deleteFolder");
        var boundSql = delete.getBoundSql(Map.of("userId", 7L, "id", "work"));
        assertTrue(boundSql.getSql().contains("WHERE user_id = ? AND id = ?"));
        assertEquals(
                List.of("userId", "id"),
                boundSql.getParameterMappings().stream().map(mapping -> mapping.getProperty()).toList());
    }

    private static Configuration load(String... resources) throws Exception {
        Configuration configuration = new Configuration();
        for (String resource : resources) {
            try (InputStream stream = Thread.currentThread().getContextClassLoader().getResourceAsStream(resource)) {
                assertNotNull(stream, resource);
                new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
            }
        }
        return configuration;
    }

    private static Map<String, Object> row(Object... fields) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (int index = 0; index < fields.length; index += 2) {
            values.put((String) fields[index], fields[index + 1]);
        }
        return values;
    }

    /** Uses MyBatis's actual record constructor/type-handler path, without a running database. */
    @SuppressWarnings("unchecked")
    private static <T> List<T> map(
            Configuration configuration, String statementId, Map<String, Object> parameters, Map<String, Object> values)
            throws Exception {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        Statement statement = mock(Statement.class);
        AtomicBoolean wasNull = new AtomicBoolean();
        when(result.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnCount()).thenReturn(values.size());
        int index = 1;
        for (var entry : values.entrySet()) {
            when(metadata.getColumnLabel(index)).thenReturn(entry.getKey());
            when(metadata.getColumnName(index)).thenReturn(entry.getKey());
            when(metadata.getColumnClassName(index))
                    .thenReturn(
                            entry.getValue() == null ? Long.class.getName() : entry.getValue().getClass().getName());
            when(metadata.getColumnType(index)).thenReturn(Types.VARCHAR);
            index++;
        }
        when(result.next()).thenReturn(true, false);
        when(result.wasNull()).thenAnswer(unused -> wasNull.get());
        when(result.getLong(anyString()))
                .thenAnswer(
                        invocation -> {
                            Object value = values.get(invocation.getArgument(0));
                            wasNull.set(value == null);
                            return value == null ? 0L : ((Number) value).longValue();
                        });
        when(result.getString(anyString())).thenAnswer(invocation -> values.get(invocation.getArgument(0)));
        when(result.getBoolean(anyString())).thenAnswer(invocation -> values.get(invocation.getArgument(0)));
        when(result.getBigDecimal(anyString())).thenAnswer(invocation -> values.get(invocation.getArgument(0)));
        when(result.getObject(anyString(), any(Class.class)))
                .thenAnswer(invocation -> values.get(invocation.getArgument(0)));
        when(statement.getResultSet()).thenReturn(result);
        when(statement.getUpdateCount()).thenReturn(-1);
        MappedStatement mappedStatement = configuration.getMappedStatement(statementId);
        var handler =
                new DefaultResultSetHandler(
                        mock(Executor.class),
                        mappedStatement,
                        null,
                        null,
                        mappedStatement.getBoundSql(parameters),
                        RowBounds.DEFAULT);
        return (List<T>) (List<?>) handler.handleResultSets(statement);
    }
}
