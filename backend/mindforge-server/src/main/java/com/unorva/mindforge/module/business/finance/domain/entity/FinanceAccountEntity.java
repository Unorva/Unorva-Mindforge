package com.unorva.mindforge.module.business.finance.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mf_finance_account")
public class FinanceAccountEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String name;
    private String accountType;
    private BigDecimal openingBalance;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
