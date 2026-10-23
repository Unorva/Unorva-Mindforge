package com.unorva.mindforge.module.business.mail.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.mail.domain.form.MailAccountSaveForm;
import com.unorva.mindforge.module.business.mail.domain.form.MailPatchForm;
import com.unorva.mindforge.module.business.mail.domain.form.MailSaveForm;
import com.unorva.mindforge.module.business.mail.domain.form.MailSendForm;
import com.unorva.mindforge.module.business.mail.domain.vo.ConnectionTestVO;
import com.unorva.mindforge.module.business.mail.domain.vo.MailAccountVO;
import com.unorva.mindforge.module.business.mail.domain.vo.MailSyncVO;
import com.unorva.mindforge.module.business.mail.domain.vo.MailVO;
import com.unorva.mindforge.module.business.mail.domain.vo.ProviderVO;
import com.unorva.mindforge.module.business.mail.service.MailAccountService;
import com.unorva.mindforge.module.business.mail.service.MailLiveService;
import com.unorva.mindforge.module.business.mail.service.MailService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Mailbox configuration, cached inbox, drafts and explicitly requested delivery. */
@RestController
@RequiredArgsConstructor
public class MailController {
    private final MailService mailService;
    private final MailAccountService accountService;
    private final MailLiveService liveService;

    @GetMapping("/mail")
    public Result<List<MailVO>> list(@RequestParam(required = false) Long accountId) {
        return Result.success(mailService.list(CurrentUser.id(), accountId));
    }

    @GetMapping("/mail/providers")
    public Result<List<ProviderVO>> providers() {
        return Result.success(accountService.providers());
    }

    @GetMapping("/mail/unread-count")
    public Result<Long> unreadCount() {
        return Result.success(mailService.unreadCount(CurrentUser.id()));
    }

    @GetMapping("/mail/accounts")
    public Result<List<MailAccountVO>> accounts() {
        return Result.success(accountService.list(CurrentUser.id()));
    }

    @PostMapping("/mail/accounts/upsert")
    public Result<MailAccountVO> saveAccount(@RequestBody @Valid MailAccountSaveForm param) {
        return updated(accountService.save(CurrentUser.id(), param));
    }

    @DeleteMapping("/mail/accounts/{id}")
    public Result<Void> deleteAccount(@PathVariable long id) {
        accountService.delete(CurrentUser.id(), id);
        return updated(null);
    }

    @PostMapping("/mail/accounts/{id}/test")
    public Result<ConnectionTestVO> testAccount(@PathVariable long id) {
        return Result.success(accountService.test(CurrentUser.id(), id));
    }

    @PostMapping("/mail/accounts/{id}/sync")
    public Result<MailSyncVO> syncAccount(@PathVariable long id) {
        return updated(mailService.sync(CurrentUser.id(), id));
    }

    @PostMapping("/mail/send")
    public Result<MailVO> send(@RequestBody @Valid MailSendForm param) {
        return updated(mailService.send(CurrentUser.id(), param));
    }

    @PostMapping("/mail/{id}/recover-send")
    public Result<MailVO> recoverSend(@PathVariable long id) {
        return updated(mailService.recoverSend(CurrentUser.id(), id));
    }

    @PostMapping("/mail/upsert")
    public Result<MailVO> save(@RequestBody @Valid MailSaveForm param) {
        return updated(mailService.save(CurrentUser.id(), param));
    }

    @PatchMapping("/mail/{id}")
    public Result<MailVO> patch(@PathVariable long id, @RequestBody @Valid MailPatchForm param) {
        return updated(mailService.patch(CurrentUser.id(), id, param));
    }

    @DeleteMapping("/mail/{id}")
    public Result<Void> delete(@PathVariable long id) {
        mailService.delete(CurrentUser.id(), id);
        return updated(null);
    }

    private <T> Result<T> updated(T data) {
        liveService.changed(CurrentUser.id());
        return Result.success(data);
    }
}
