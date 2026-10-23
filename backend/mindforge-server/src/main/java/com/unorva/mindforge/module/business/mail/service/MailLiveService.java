package com.unorva.mindforge.module.business.mail.service;

import com.unorva.mindforge.module.business.mail.domain.vo.MailAccountVO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppIntegrationDTO;
import com.unorva.mindforge.module.system.settings.service.SettingsService;

import jakarta.annotation.PreDestroy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.FutureTask;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/** One background mailbox schedule per connected user, shared by all workspace tabs. */
@Service
public class MailLiveService {
    private static final long REALTIME_MS = 15_000L;
    private static final long MAX_RETRY_MS = 300_000L;
    private static final long STREAM_TIMEOUT_MS = 300_000L;
    private final MailService mail;
    private final MailAccountService accounts;
    private final SettingsService settings;
    private final Clock clock;
    private final ScheduledExecutorService scheduler;
    private final ExecutorService workers;
    private final Supplier<SseEmitter> emitters;
    private final Map<Long, UserSchedule> users = new ConcurrentHashMap<>();
    private final AtomicLong revisions = new AtomicLong(System.currentTimeMillis());
    private final AtomicBoolean closed = new AtomicBoolean();

    @Autowired
    public MailLiveService(MailService mail, MailAccountService accounts, SettingsService settings) {
        this(
                mail,
                accounts,
                settings,
                Clock.systemUTC(),
                Executors.newSingleThreadScheduledExecutor(
                        Thread.ofPlatform().daemon().name("mail-live-clock").factory()),
                Executors.newVirtualThreadPerTaskExecutor(),
                () -> new SseEmitter(STREAM_TIMEOUT_MS));
    }

    MailLiveService(
            MailService mail,
            MailAccountService accounts,
            SettingsService settings,
            Clock clock,
            ScheduledExecutorService scheduler,
            ExecutorService workers,
            Supplier<SseEmitter> emitters) {
        this.mail = mail;
        this.accounts = accounts;
        this.settings = settings;
        this.clock = clock;
        this.scheduler = scheduler;
        this.workers = workers;
        this.emitters = emitters;
    }

    public SseEmitter subscribe(long userId) {
        if (closed.get()) throw new IllegalStateException("Mail updates are stopping");
        SseEmitter emitter = emitters.get();
        users.compute(
                userId,
                (id, existing) -> {
                    UserSchedule user = existing == null ? new UserSchedule(id) : existing;
                    user.clients.add(emitter);
                    Runnable remove = () -> unsubscribe(user, emitter);
                    emitter.onCompletion(remove);
                    emitter.onTimeout(remove);
                    emitter.onError(ignored -> remove.run());
                    if (existing == null) {
                        user.timer =
                                scheduler.scheduleAtFixedRate(() -> tick(user), 0L, REALTIME_MS, TimeUnit.MILLISECONDS);
                    } else {
                        // A new tab receives the latest snapshot without starting another sync.
                        executeSafely(user, () -> send(user, emitter, false));
                    }
                    return user;
                });
        return emitter;
    }

    /** Called only after a committed foreground mutation; never creates a background subscriber. */
    public void changed(long userId) {
        UserSchedule user = users.get(userId);
        if (user == null || !user.active.get()) return;
        executeSafely(
                user,
                () -> {
                    try {
                        publishCount(user, true);
                    } catch (RuntimeException ignored) {
                        user.dirty.set(true);
                    }
                });
    }

    private void executeSafely(UserSchedule user, Runnable command) {
        try {
            if (user.active.get() && !closed.get()) workers.execute(command);
        } catch (RejectedExecutionException ignored) {
            // Shutdown racing a completed foreground mutation must not turn it into an HTTP error.
            user.dirty.set(true);
        }
    }

    private void unsubscribe(UserSchedule user, SseEmitter emitter) {
        users.computeIfPresent(
                user.userId,
                (id, current) -> {
                    if (current != user) return current;
                    user.clients.remove(emitter);
                    if (!user.clients.isEmpty()) return user;
                    stop(user);
                    return null;
                });
    }

    private void tick(UserSchedule user) {
        if (!user.active.get()) return;
        // Provider I/O can take longer than one heartbeat; never make liveness wait for it.
        executeSafely(
                user,
                () -> {
                    try {
                        publishCount(user, user.dirty.getAndSet(false));
                    } catch (RuntimeException ignored) {
                        // Retain the last count while the database is temporarily unavailable.
                        user.dirty.set(true);
                    }
                    heartbeat(user);
                });
        if (!user.running.compareAndSet(false, true)) return;
        try {
            user.cycle =
                    workers.submit(
                            () -> {
                                try {
                                    refresh(user);
                                } catch (RuntimeException ignored) {
                                    // Keep the last successful state; a transient settings/DB failure retries.
                                    user.dirty.set(true);
                                    heartbeat(user);
                                } finally {
                                    user.running.set(false);
                                }
                            });
        } catch (RejectedExecutionException ignored) {
            user.running.set(false);
        }
    }

    private void refresh(UserSchedule user) {
        if (!user.active.get()) return;
        AppIntegrationDTO preference =
                settings.get(user.userId).apps().stream()
                        .filter(app -> "mail".equals(app.id()))
                        .findFirst()
                        .orElse(null);
        boolean enabled = preference == null || preference.enabled();
        user.enabled = enabled;
        String frequency = preference == null ? "实时" : preference.options().syncFrequency();
        user.automatic = enabled && !"手动".equals(frequency);
        if (!frequency.equals(user.frequency)) {
            user.schedules.clear();
            user.frequency = frequency;
        }
        publishCount(user, false);
        if (!enabled || "手动".equals(frequency)) {
            user.schedules.clear();
            user.accountIds = Set.of();
            heartbeat(user);
            return;
        }
        user.interval =
                switch (frequency) {
                    case "每小时" -> 3_600_000L;
                    case "每天" -> 86_400_000L;
                    default -> REALTIME_MS;
                };
        List<MailAccountVO> configured = accounts.list(user.userId);
        Set<Long> ids = new HashSet<>();
        for (MailAccountVO account : configured) {
            if (account.enabled() && account.credentialConfigured()) ids.add(account.id());
        }
        user.accountIds = Set.copyOf(ids);
        user.schedules.keySet().retainAll(ids);
        long now = clock.millis();
        for (MailAccountVO account : configured) {
            if (!ids.contains(account.id())) continue;
            Retry retry = user.schedules.get(account.id());
            if (retry != null && retry.nextAt > now) continue;
            if (!user.inFlight.add(account.id())) continue;
            long accountId = account.id();
            FutureTask<Void> task =
                    new FutureTask<>(
                            () -> {
                                synchronize(user, accountId);
                                return null;
                            }) {
                        @Override
                        protected void done() {
                            user.accountTasks.remove(accountId, this);
                            user.inFlight.remove(accountId);
                        }
                    };
            user.accountTasks.put(accountId, task);
            try {
                workers.execute(task);
            } catch (RejectedExecutionException ignored) {
                task.cancel(false);
            }
            if (!user.active.get()) task.cancel(true);
        }
        heartbeat(user);
    }

    private void synchronize(UserSchedule user, long accountId) {
        boolean acquired = false;
        try {
            user.permits.acquire();
            acquired = true;
            if (!user.active.get() || !user.automatic || !user.accountIds.contains(accountId)) return;
            boolean changed = mail.sync(user.userId, accountId).changedCount() > 0;
            user.schedules.put(accountId, new Retry(clock.millis() + user.interval, 0));
            try {
                publishCount(user, changed);
            } catch (RuntimeException ignored) {
                user.dirty.set(true);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } catch (RuntimeException ignored) {
            int failures = Math.min(10, user.schedules.getOrDefault(accountId, new Retry(0, 0)).failures + 1);
            long delay = Math.min(MAX_RETRY_MS, REALTIME_MS * (1L << failures));
            user.schedules.put(accountId, new Retry(clock.millis() + delay, failures));
        } finally {
            if (acquired) user.permits.release();
        }
    }

    private void publishCount(UserSchedule user, boolean refreshed) {
        if (!user.active.get()) return;
        boolean publish;
        synchronized (user) {
            // Serialize small count reads, so an older DB response cannot replace a newer badge.
            long count = user.enabled ? mail.unreadCount(user.userId) : 0L;
            publish = user.update == null || user.update.unreadCount() != count || refreshed;
            if (!publish) return;
            user.update = new MailUpdate(count, revisions.incrementAndGet());
        }
        // Never hold the user monitor during container callbacks or socket writes.
        for (SseEmitter emitter : user.clients) send(user, emitter, false);
    }

    private void heartbeat(UserSchedule user) {
        if (!user.active.get()) return;
        for (SseEmitter emitter : user.clients) send(user, emitter, true);
    }

    private void send(UserSchedule user, SseEmitter emitter, boolean heartbeat) {
        if (!user.active.get() || !user.clients.contains(emitter)) return;
        try {
            synchronized (emitter) {
                MailUpdate update = user.update;
                if (heartbeat || update == null) {
                    emitter.send(SseEmitter.event().comment("keep-alive"));
                } else {
                    emitter.send(SseEmitter.event().name("mail").data(update));
                }
            }
        } catch (IOException | IllegalStateException exception) {
            unsubscribe(user, emitter);
        }
    }

    private void stop(UserSchedule user) {
        user.active.set(false);
        if (user.timer != null) user.timer.cancel(false);
        if (user.cycle != null) user.cycle.cancel(true);
        for (Future<?> task : user.accountTasks.values()) task.cancel(true);
    }

    @PreDestroy
    public void close() {
        if (!closed.compareAndSet(false, true)) return;
        for (UserSchedule user : users.values()) {
            stop(user);
            for (SseEmitter emitter : user.clients) emitter.complete();
        }
        users.clear();
        scheduler.shutdownNow();
        workers.shutdownNow();
    }

    public record MailUpdate(long unreadCount, long revision) {}

    private record Retry(long nextAt, int failures) {}

    private static final class UserSchedule {
        private final long userId;
        private final Set<SseEmitter> clients = ConcurrentHashMap.newKeySet();
        private final Map<Long, Retry> schedules = new ConcurrentHashMap<>();
        private final Map<Long, Future<?>> accountTasks = new ConcurrentHashMap<>();
        private final Set<Long> inFlight = ConcurrentHashMap.newKeySet();
        private final AtomicBoolean active = new AtomicBoolean(true);
        private final AtomicBoolean running = new AtomicBoolean();
        private final AtomicBoolean dirty = new AtomicBoolean();
        private final Semaphore permits = new Semaphore(3);
        private volatile ScheduledFuture<?> timer;
        private volatile Future<?> cycle;
        private volatile boolean enabled = true;
        private volatile boolean automatic = true;
        private volatile Set<Long> accountIds = Set.of();
        private volatile long interval = REALTIME_MS;
        private volatile MailUpdate update;
        private String frequency;

        private UserSchedule(long userId) {
            this.userId = userId;
        }
    }
}
