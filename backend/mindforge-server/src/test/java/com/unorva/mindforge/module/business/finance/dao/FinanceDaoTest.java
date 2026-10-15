package com.unorva.mindforge.module.business.finance.dao;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;
import com.unorva.mindforge.module.business.finance.domain.vo.TransactionVO;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.executor.Executor;
import org.apache.ibatis.executor.resultset.DefaultResultSetHandler;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.session.RowBounds;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/** Verifies the actual XML record mapping and owner-scoped SQL contracts. */
class FinanceDaoTest {

    @Test
    void lastSupportedBudgetMonthUsesInclusiveBoundsAndKeepsExactAmounts() throws Exception {
        Configuration configuration = load("mapper/business/finance/FinanceBudgetMapper.xml");
        String statementId = "com.unorva.mindforge.module.business.finance.dao.FinanceBudgetDao.listBudgets";
        var parameters =
                Map.<String, Object>of(
                        "userId",
                        7L,
                        "month",
                        "9999-12",
                        "start",
                        LocalDate.of(9999, 12, 1),
                        "end",
                        LocalDate.of(9999, 12, 31));
        var values =
                row(
                        "id",
                        5L,
                        "month_value",
                        "9999-12",
                        "category",
                        "餐饮",
                        "amount",
                        new BigDecimal("9999999999999999.99"),
                        "spent",
                        new BigDecimal("125.50"));
        assertEquals(
                List.of(
                        new BudgetVO(
                                5L, "9999-12", "餐饮", new BigDecimal("9999999999999999.99"), new BigDecimal("125.50"))),
                map(configuration, statementId, parameters, values));
        var bound = configuration.getMappedStatement(statementId).getBoundSql(parameters);
        assertTrue(bound.getSql().contains("ledger.transaction_date <= ?"));
        assertEquals(
                List.of("start", "end", "userId", "month"),
                bound.getParameterMappings().stream().map(mapping -> mapping.getProperty()).toList());
    }

    @Test
    void transactionProjectionPreservesDateTypeAndDecimalPrecision() throws Exception {
        Configuration configuration =
                load(
                        "mapper/business/finance/FinanceTransactionMapper.xml",
                        "mapper/business/finance/FinanceAccountMapper.xml");
        LocalDate date = LocalDate.of(2026, 10, 9);
        var values =
                row(
                        "id",
                        8L,
                        "transaction_date",
                        date,
                        "transaction_type",
                        "支出",
                        "category",
                        "餐饮",
                        "description",
                        "午餐",
                        "account_id",
                        5L,
                        "amount",
                        new BigDecimal("26.80"),
                        "source",
                        "手动录入");
        assertEquals(
                List.of(new TransactionVO(8L, date, "支出", "餐饮", "午餐", 5L, new BigDecimal("26.80"), "手动录入")),
                map(
                        configuration,
                        "com.unorva.mindforge.module.business.finance.dao.FinanceTransactionDao.listTransactions",
                        Map.of("userId", 7L),
                        values));
        assertArrayEquals(
                new String[] {"entity.id"},
                configuration
                        .getMappedStatement(
                                "com.unorva.mindforge.module.business.finance.dao.FinanceTransactionDao.insertTransaction")
                        .getKeyProperties());
        assertArrayEquals(
                new String[] {"entity.id"},
                configuration
                        .getMappedStatement(
                                "com.unorva.mindforge.module.business.finance.dao.FinanceAccountDao.insertAccount")
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
