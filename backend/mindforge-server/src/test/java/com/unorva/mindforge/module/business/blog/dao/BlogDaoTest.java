package com.unorva.mindforge.module.business.blog.dao;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.blog.domain.bo.BlogCommentBO;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogPostBO;

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
class BlogDaoTest {

    @Test
    void nullableParentAndPostFieldsAreMappedWithoutInventingRelationships() throws Exception {
        Configuration configuration =
                load("mapper/business/blog/BlogPostMapper.xml", "mapper/business/blog/BlogCommentMapper.xml");
        LocalDateTime createdAt = LocalDateTime.of(2026, 10, 9, 8, 0);
        var comment = row("id", 8L, "post_id", 5L, "parent_id", null, "content", "原有内容", "created_at", createdAt);
        assertEquals(
                List.of(new BlogCommentBO(8L, 5L, null, "原有内容", createdAt)),
                map(
                        configuration,
                        "com.unorva.mindforge.module.business.blog.dao.BlogCommentDao.listComments",
                        Map.of("userId", 7L),
                        comment));
        var post =
                row(
                        "id",
                        8L,
                        "title",
                        "文章",
                        "content",
                        "原有内容",
                        "cover_img",
                        "/cover.png",
                        "created_at",
                        createdAt,
                        "view_count",
                        15L,
                        "share_count",
                        3L,
                        "category",
                        "技术",
                        "featured",
                        true,
                        "published",
                        false);
        assertEquals(
                List.of(new BlogPostBO(8L, "文章", "原有内容", "/cover.png", createdAt, 15L, 3L, "技术", true, false)),
                map(
                        configuration,
                        "com.unorva.mindforge.module.business.blog.dao.BlogPostDao.listPosts",
                        Map.of("userId", 7L),
                        post));
    }

    @Test
    void commentExistenceIsScopedToOwnerAndPostAndInsertsReturnGeneratedKeys() throws Exception {
        Configuration configuration =
                load("mapper/business/blog/BlogPostMapper.xml", "mapper/business/blog/BlogCommentMapper.xml");
        String namespace = "com.unorva.mindforge.module.business.blog.dao.BlogCommentDao.";
        var bound =
                configuration
                        .getMappedStatement(namespace + "countComment")
                        .getBoundSql(Map.of("userId", 7L, "postId", 5L, "id", 8L));
        assertTrue(bound.getSql().contains("WHERE user_id = ? AND post_id = ? AND id = ?"));
        assertArrayEquals(
                new String[] {"entity.id"},
                configuration.getMappedStatement(namespace + "insertComment").getKeyProperties());
        assertArrayEquals(
                new String[] {"entity.id"},
                configuration
                        .getMappedStatement("com.unorva.mindforge.module.business.blog.dao.BlogPostDao.insertPost")
                        .getKeyProperties());
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
