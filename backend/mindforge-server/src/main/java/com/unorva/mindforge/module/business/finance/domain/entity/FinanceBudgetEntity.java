package com.unorva.mindforge.module.business.finance.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mf_finance_budget")
public class FinanceBudgetEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String monthValue;
    private String category;
    private BigDecimal amount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
