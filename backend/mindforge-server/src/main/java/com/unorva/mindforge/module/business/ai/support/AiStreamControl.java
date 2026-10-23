package com.unorva.mindforge.module.business.ai.support;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.Future;

/** Closes the provider response when the browser disconnects, stops, or reaches its deadline. */
public final class AiStreamControl {
    private boolean cancelled;
    private boolean timedOut;
    private Future<?> responseFuture;
    private InputStream responseBody;
    private Thread worker;

    public synchronized void attachWorker(Thread value) {
        worker = value;
        if (cancelled) value.interrupt();
    }

    public synchronized void attachFuture(Future<?> value) {
        responseFuture = value;
        if (cancelled) value.cancel(true);
    }

    public synchronized void attachBody(InputStream value) {
        responseBody = value;
        if (cancelled) closeBody();
    }

    public synchronized void cancel() {
        cancelled = true;
        if (responseFuture != null) responseFuture.cancel(true);
        if (worker != null && worker != Thread.currentThread()) worker.interrupt();
        closeBody();
    }

    public synchronized void timeout() {
        timedOut = true;
        cancel();
    }

    public synchronized boolean cancelled() {
        return cancelled;
    }

    public synchronized boolean timedOut() {
        return timedOut;
    }

    public synchronized void checkActive() {
        if (cancelled) {
            throw new BusinessException(
                    timedOut ? "AI 生成超时，请减少输出长度后重试" : "AI 生成已停止", BusinessErrorCode.PROVIDER_FAILED);
        }
    }

    public synchronized void release() {
        closeBody();
        responseFuture = null;
        worker = null;
    }

    private void closeBody() {
        if (responseBody == null) return;
        try {
            responseBody.close();
        } catch (IOException ignored) {
            // Closing is best effort; no provider exception text may reach the caller.
        } finally {
            responseBody = null;
        }
    }
}
