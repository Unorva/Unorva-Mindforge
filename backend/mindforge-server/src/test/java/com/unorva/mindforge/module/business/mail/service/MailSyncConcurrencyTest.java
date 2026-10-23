package com.unorva.mindforge.module.business.mail.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.bo.MailSyncSnapshotBO;
import com.unorva.mindforge.module.business.mail.domain.vo.MailSyncVO;
import com.unorva.mindforge.module.business.mail.manager.MailManager;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Overlapping requests share provider I/O, including failures, without serializing other owners. */
class MailSyncConcurrencyTest {
    private final MailManager manager = mock(MailManager.class);
    private final MailGateway gateway = mock(MailGateway.class);
    private final MailService service = new MailService(manager, gateway);
    private final MailConnectionBO connection =
            new MailConnectionBO(
                    3L,
                    "mail@example.com",
                    "Mail",
                    "mail@example.com",
                    "imap.example.com",
                    993,
                    "ssl",
                    "smtp.example.com",
                    465,
                    "ssl",
                    "credential",
                    "password");

    @Test
    void overlappingManualAndBackgroundRequestsShareTheSameResult() throws Exception {
        var snapshot = new MailSyncSnapshotBO(connection, Map.of());
        var expected = new MailSyncVO(3L, 0, "同步完成");
        when(manager.prepareSync(7L, 3L)).thenReturn(snapshot);
        when(manager.storeSync(7L, snapshot, List.of())).thenReturn(expected);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(gateway.fetchInbox(eq(connection), anyMap()))
                .thenAnswer(
                        call -> {
                            entered.countDown();
                            assertTrue(release.await(5, TimeUnit.SECONDS));
                            return List.of();
                        });
        CompletableFuture<MailSyncVO> first = CompletableFuture.supplyAsync(() -> service.sync(7L, 3L));
        assertTrue(entered.await(5, TimeUnit.SECONDS));
        AtomicReference<MailSyncVO> secondResult = new AtomicReference<>();
        AtomicReference<Throwable> secondFailure = new AtomicReference<>();
        Thread second =
                Thread.ofVirtual()
                        .start(
                                () -> {
                                    try {
                                        secondResult.set(service.sync(7L, 3L));
                                    } catch (Throwable failure) {
                                        secondFailure.set(failure);
                                    }
                                });
        try {
            awaitWaiting(second);
            verify(gateway, times(1)).fetchInbox(eq(connection), anyMap());
        } finally {
            release.countDown();
        }
        assertSame(expected, first.get(5, TimeUnit.SECONDS));
        second.join(Duration.ofSeconds(5));
        assertFalse(second.isAlive());
        assertNull(secondFailure.get());
        assertSame(expected, secondResult.get());
        verify(manager, times(1)).prepareSync(7L, 3L);
        verify(manager, times(1)).storeSync(7L, snapshot, List.of());
    }

    @Test
    void aSharedProviderFailureIsReleasedSoTheNextRequestCanRetry() throws Exception {
        var snapshot = new MailSyncSnapshotBO(connection, Map.of());
        var expected = new MailSyncVO(3L, 0, "同步完成");
        var failure = new BusinessException("同步失败", BusinessErrorCode.PROVIDER_FAILED);
        when(manager.prepareSync(7L, 3L)).thenReturn(snapshot);
        when(manager.storeSync(7L, snapshot, List.of())).thenReturn(expected);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(gateway.fetchInbox(eq(connection), anyMap()))
                .thenAnswer(
                        call -> {
                            entered.countDown();
                            assertTrue(release.await(5, TimeUnit.SECONDS));
                            throw failure;
                        })
                .thenReturn(List.of());
        CompletableFuture<Throwable> first =
                CompletableFuture.supplyAsync(
                        () -> {
                            try {
                                service.sync(7L, 3L);
                                return null;
                            } catch (Throwable error) {
                                return error;
                            }
                        });
        assertTrue(entered.await(5, TimeUnit.SECONDS));
        AtomicReference<Throwable> secondFailure = new AtomicReference<>();
        Thread second =
                Thread.ofVirtual()
                        .start(
                                () -> {
                                    try {
                                        service.sync(7L, 3L);
                                    } catch (Throwable error) {
                                        secondFailure.set(error);
                                    }
                                });
        try {
            awaitWaiting(second);
        } finally {
            release.countDown();
        }
        assertSame(failure, first.get(5, TimeUnit.SECONDS));
        second.join(Duration.ofSeconds(5));
        assertFalse(second.isAlive());
        assertSame(failure, secondFailure.get());
        assertSame(expected, service.sync(7L, 3L));
        verify(gateway, times(2)).fetchInbox(eq(connection), anyMap());
        verify(manager, times(1)).recordFailure(eq(7L), eq(connection), anyString());
    }

    @Test
    void aSlowAccountDoesNotBlockAnotherAccountOrOwner() throws Exception {
        var snapshot = new MailSyncSnapshotBO(connection, Map.of());
        var expected = new MailSyncVO(3L, 0, "同步完成");
        when(manager.prepareSync(anyLong(), anyLong())).thenReturn(snapshot);
        when(manager.storeSync(anyLong(), eq(snapshot), anyList())).thenReturn(expected);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(gateway.fetchInbox(eq(connection), anyMap()))
                .thenAnswer(
                        call -> {
                            entered.countDown();
                            assertTrue(release.await(5, TimeUnit.SECONDS));
                            return List.of();
                        })
                .thenReturn(List.of());
        var first = CompletableFuture.supplyAsync(() -> service.sync(7L, 3L));
        assertTrue(entered.await(5, TimeUnit.SECONDS));
        try {
            assertTimeoutPreemptively(
                    Duration.ofSeconds(2),
                    () -> {
                        assertSame(expected, service.sync(7L, 4L));
                        assertSame(expected, service.sync(8L, 3L));
                    });
        } finally {
            release.countDown();
        }
        assertSame(expected, first.get(5, TimeUnit.SECONDS));
        verify(gateway, times(3)).fetchInbox(eq(connection), anyMap());
    }

    private static void awaitWaiting(Thread thread) {
        assertTimeoutPreemptively(
                Duration.ofSeconds(3),
                () -> {
                    while (thread.getState() != Thread.State.WAITING) {
                        assertTrue(thread.isAlive(), "Concurrent request must remain in-flight until released");
                        Thread.onSpinWait();
                    }
                });
    }
}
