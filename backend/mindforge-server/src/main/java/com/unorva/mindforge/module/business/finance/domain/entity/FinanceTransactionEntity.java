package com.unorva.mindforge.module.business.finance.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("mf_finance_transaction")
public class FinanceTransactionEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long accountId;
    private LocalDate transactionDate;
    private String transactionType;
    private String category;
    private String description;
    private BigDecimal amount;
    private String source;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
