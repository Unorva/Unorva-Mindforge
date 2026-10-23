package com.unorva.mindforge.module.business.mail.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.mail.domain.vo.MailAccountVO;
import com.unorva.mindforge.module.business.mail.domain.vo.MailSyncVO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppIntegrationDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppOptionsDTO;
import com.unorva.mindforge.module.system.settings.domain.vo.SettingsVO;
import com.unorva.mindforge.module.system.settings.service.SettingsService;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

class MailLiveServiceTest {
    @Test
    void sharesOneBackgroundScheduleAcrossTabsAndSkipsUnchangedSnapshots() throws Exception {
        try (Fixture fixture = new Fixture()) {
            CaptureEmitter first = (CaptureEmitter) fixture.service.subscribe(7L);
            CaptureEmitter second = (CaptureEmitter) fixture.service.subscribe(7L);
            assertEquals(1, fixture.ticks.size());
            fixture.tick(0);
            verify(fixture.mail).sync(7L, 11L);
            assertEquals(1, first.updates.size());
            assertEquals(1, second.updates.size());
            fixture.clock.advance(15_000);
            fixture.tick(0);
            verify(fixture.mail, times(2)).sync(7L, 11L);
            assertEquals(1, first.updates.size());
            assertTrue(first.heartbeats >= 2);
            assertEquals(300_000L, first.getTimeout());
        }
    }

    @Test
    void isolatesOwnersAndBroadcastsSameCountForegroundChanges() throws Exception {
        try (Fixture fixture = new Fixture()) {
            when(fixture.mail.unreadCount(8L)).thenReturn(9L);
            CaptureEmitter first = (CaptureEmitter) fixture.service.subscribe(7L);
            CaptureEmitter other = (CaptureEmitter) fixture.service.subscribe(8L);
            fixture.tick(0);
            fixture.tick(1);
            verify(fixture.mail).sync(7L, 11L);
            verify(fixture.mail).sync(8L, 11L);
            assertEquals(2L, first.updates.getLast().unreadCount());
            assertEquals(9L, other.updates.getLast().unreadCount());
            long previous = first.updates.getLast().revision();
            fixture.service.changed(7L);
            assertEquals(2, first.updates.size());
            assertTrue(first.updates.getLast().revision() > previous);
            assertEquals(1, other.updates.size());
            fixture.service.changed(99L);
            assertEquals(2, fixture.ticks.size());
            verify(fixture.mail, never()).unreadCount(99L);
        }
    }

    @Test
    void backsOffOnlyTheFailedAccountWhileHealthyAccountsContinue() throws Exception {
        try (Fixture fixture = new Fixture()) {
            when(fixture.accounts.list(anyLong())).thenReturn(List.of(account(11L), account(12L)));
            when(fixture.mail.sync(7L, 11L)).thenThrow(new IllegalStateException("offline"));
            fixture.service.subscribe(7L);
            fixture.tick(0);
            fixture.clock.advance(15_000);
            fixture.tick(0);
            verify(fixture.mail, times(1)).sync(7L, 11L);
            verify(fixture.mail, times(2)).sync(7L, 12L);
            fixture.clock.advance(15_000);
            fixture.tick(0);
            verify(fixture.mail, times(2)).sync(7L, 11L);
            fixture.clock.advance(15_000);
            fixture.tick(0);
            verify(fixture.mail, times(2)).sync(7L, 11L);
            verify(fixture.mail, times(4)).sync(7L, 12L);
        }
    }

    @Test
    void respectsManualDisabledAndHourlyPreferences() throws Exception {
        try (Fixture fixture = new Fixture()) {
            fixture.preference("手动", true);
            CaptureEmitter emitter = (CaptureEmitter) fixture.service.subscribe(7L);
            fixture.tick(0);
            assertEquals(2L, emitter.updates.getLast().unreadCount());
            verify(fixture.mail, never()).sync(anyLong(), anyLong());
            fixture.preference("实时", false);
            fixture.tick(0);
            assertEquals(0L, emitter.updates.getLast().unreadCount());
            verify(fixture.accounts, never()).list(anyLong());
            fixture.preference("每小时", true);
            fixture.tick(0);
            fixture.clock.advance(15_000);
            fixture.tick(0);
            verify(fixture.mail, times(1)).sync(7L, 11L);
            fixture.clock.advance(3_600_000);
            fixture.tick(0);
            verify(fixture.mail, times(2)).sync(7L, 11L);
        }
    }

    @Test
    void releasesTheLastSubscriptionAndReconnectsWithANewerRevision() throws Exception {
        try (Fixture fixture = new Fixture()) {
            CaptureEmitter first = (CaptureEmitter) fixture.service.subscribe(7L);
            CaptureEmitter second = (CaptureEmitter) fixture.service.subscribe(7L);
            fixture.tick(0);
            long revision = first.updates.getLast().revision();
            first.complete();
            verify(fixture.timers.getFirst(), never()).cancel(anyBoolean());
            second.complete();
            verify(fixture.timers.getFirst()).cancel(false);
            clearInvocations(fixture.mail);
            fixture.tick(0);
            verifyNoInteractions(fixture.mail);
            CaptureEmitter reconnected = (CaptureEmitter) fixture.service.subscribe(7L);
            fixture.tick(1);
            assertTrue(reconnected.updates.getLast().revision() > revision);
        }
    }

    @Test
    void limitsConcurrentProviderCallsAndKeepsHeartbeatsDuringSlowSynchronization() throws Exception {
        ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();
        try (Fixture fixture = new Fixture(workers)) {
            when(fixture.accounts.list(anyLong()))
                    .thenReturn(List.of(account(11), account(12), account(13), account(14), account(15)));
            CountDownLatch entered = new CountDownLatch(3);
            CountDownLatch release = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(5);
            AtomicInteger concurrent = new AtomicInteger();
            AtomicInteger maximum = new AtomicInteger();
            when(fixture.mail.sync(anyLong(), anyLong()))
                    .thenAnswer(
                            invocation -> {
                                int active = concurrent.incrementAndGet();
                                maximum.accumulateAndGet(active, Math::max);
                                entered.countDown();
                                try {
                                    assertTrue(release.await(5, TimeUnit.SECONDS));
                                    return new MailSyncVO(invocation.getArgument(1), 0, "ok", 0);
                                } finally {
                                    concurrent.decrementAndGet();
                                    done.countDown();
                                }
                            });
            CaptureEmitter emitter = (CaptureEmitter) fixture.service.subscribe(7L);
            fixture.tick(0);
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            int heartbeats = emitter.heartbeats;
            fixture.tick(0);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
            while (emitter.heartbeats <= heartbeats && System.nanoTime() < deadline) Thread.onSpinWait();
            assertTrue(emitter.heartbeats > heartbeats);
            assertEquals(3, maximum.get());
            release.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS));
            verify(fixture.mail, times(5)).sync(anyLong(), anyLong());
        }
    }

    @Test
    void aSlowMailboxDoesNotDelayAnotherMailboxNextPollOrItsUpdate() throws Exception {
        try (Fixture fixture = new Fixture(Executors.newVirtualThreadPerTaskExecutor())) {
            when(fixture.accounts.list(anyLong())).thenReturn(List.of(account(11), account(12)));
            CountDownLatch slowEntered = new CountDownLatch(1);
            CountDownLatch slowRelease = new CountDownLatch(1);
            CountDownLatch healthyTwice = new CountDownLatch(2);
            when(fixture.mail.sync(7L, 11L))
                    .thenAnswer(
                            invocation -> {
                                slowEntered.countDown();
                                assertTrue(slowRelease.await(5, TimeUnit.SECONDS));
                                return new MailSyncVO(11L, 0, "ok", 0);
                            });
            when(fixture.mail.sync(7L, 12L))
                    .thenAnswer(
                            invocation -> {
                                healthyTwice.countDown();
                                return new MailSyncVO(12L, 1, "ok", 1);
                            });
            CaptureEmitter emitter = (CaptureEmitter) fixture.service.subscribe(7L);
            fixture.tick(0);
            assertTrue(slowEntered.await(5, TimeUnit.SECONDS));
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
            // Drive future polling ticks while one provider remains blocked.
            while (healthyTwice.getCount() > 0 && System.nanoTime() < deadline) {
                fixture.clock.advance(15_000);
                fixture.tick(0);
                Thread.sleep(2);
            }
            assertEquals(0L, healthyTwice.getCount());
            verify(fixture.mail, times(1)).sync(7L, 11L);
            assertTrue(emitter.updates.size() >= 2);
            slowRelease.countDown();
        }
    }

    private static MailAccountVO account(long id) {
        return new MailAccountVO(
                id,
                "qq",
                "test@example.invalid",
                "测试",
                "test",
                "imap.example.invalid",
                993,
                "ssl",
                "smtp.example.invalid",
                465,
                "ssl",
                true,
                false,
                true,
                "connected",
                null,
                null,
                null,
                null,
                "password");
    }

    private static final class Fixture implements AutoCloseable {
        private final MailService mail = mock(MailService.class);
        private final MailAccountService accounts = mock(MailAccountService.class);
        private final SettingsService settings = mock(SettingsService.class);
        private final SettingsVO preferences = mock(SettingsVO.class);
        private final MutableClock clock = new MutableClock();
        private final List<Runnable> ticks = new ArrayList<>();
        private final List<ScheduledFuture<?>> timers = new ArrayList<>();
        private final MailLiveService service;

        private Fixture() {
            this(new DirectExecutor());
        }

        private Fixture(ExecutorService workers) {
            ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
            when(scheduler.scheduleAtFixedRate(any(Runnable.class), eq(0L), eq(15_000L), eq(TimeUnit.MILLISECONDS)))
                    .thenAnswer(
                            invocation -> {
                                ticks.add(invocation.getArgument(0));
                                ScheduledFuture<?> timer = mock(ScheduledFuture.class);
                                timers.add(timer);
                                return timer;
                            });
            when(settings.get(anyLong())).thenReturn(preferences);
            preference("实时", true);
            when(mail.unreadCount(anyLong())).thenReturn(2L);
            when(accounts.list(anyLong())).thenReturn(List.of(account(11L)));
            when(mail.sync(anyLong(), anyLong())).thenReturn(new MailSyncVO(11L, 1, "ok", 0));
            service = new MailLiveService(mail, accounts, settings, clock, scheduler, workers, CaptureEmitter::new);
        }

        private void preference(String frequency, boolean enabled) {
            when(preferences.apps())
                    .thenReturn(
                            List.of(
                                    new AppIntegrationDTO(
                                            "mail", "邮件", "", enabled, new AppOptionsDTO(frequency, true, false))));
        }

        private void tick(int index) {
            ticks.get(index).run();
        }

        @Override
        public void close() {
            service.close();
        }
    }

    private static final class CaptureEmitter extends SseEmitter {
        private final List<MailLiveService.MailUpdate> updates = new CopyOnWriteArrayList<>();
        private volatile int heartbeats;
        private Runnable completion;

        private CaptureEmitter() {
            super(300_000L);
        }

        @Override
        public void send(SseEventBuilder builder) throws IOException {
            boolean update = false;
            for (var item : builder.build()) {
                if (item.getData() instanceof MailLiveService.MailUpdate message) {
                    updates.add(message);
                    update = true;
                }
            }
            if (!update) heartbeats++;
        }

        @Override
        public synchronized void onCompletion(Runnable callback) {
            completion = callback;
        }

        @Override
        public synchronized void onTimeout(Runnable callback) {}

        @Override
        public synchronized void onError(Consumer<Throwable> callback) {}

        @Override
        public synchronized void complete() {
            if (completion != null) completion.run();
        }
    }

    private static final class MutableClock extends Clock {
        private volatile long millis;

        private void advance(long duration) {
            millis += duration;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }
    }

    private static final class DirectExecutor extends AbstractExecutorService {
        private boolean stopped;

        @Override
        public void shutdown() {
            stopped = true;
        }

        @Override
        public List<Runnable> shutdownNow() {
            stopped = true;
            return List.of();
        }

        @Override
        public boolean isShutdown() {
            return stopped;
        }

        @Override
        public boolean isTerminated() {
            return stopped;
        }

        @Override
        public boolean awaitTermination(long timeout, TimeUnit unit) {
            return stopped;
        }

        @Override
        public void execute(Runnable command) {
            command.run();
        }
    }
}
